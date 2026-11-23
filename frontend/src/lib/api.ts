import type { EnquiryField, EnquiryPayload, FieldErrors } from "@/lib/enquiry";

// Same-origin on Vercel, where /api routes to the backend service. Local dev points at uvicorn.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type SubmitResult =
  | { status: "accepted"; id: string; receivedAt: string }
  | { status: "invalid"; fieldErrors: FieldErrors; message: string }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

type Problem = {
  title?: string;
  detail?: string;
  errors?: { field: string; message: string }[];
};

const knownFields: ReadonlySet<string> = new Set<EnquiryField>([
  "kind",
  "full_name",
  "email",
  "organisation",
  "role_title",
  "role_transition",
  "cohort_size",
  "message",
  "consent",
]);

export async function submitEnquiry(payload: EnquiryPayload, idempotencyKey: string): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/v1/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { status: "unavailable" };
  }

  if (response.status === 202) {
    const body = (await response.json()) as { id: string; received_at: string };
    return { status: "accepted", id: body.id, receivedAt: body.received_at };
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    return { status: "rate_limited", retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 600 };
  }

  if (response.status === 422 || response.status === 400) {
    const problem = (await response.json().catch(() => ({}))) as Problem;
    const fieldErrors: FieldErrors = {};
    for (const error of problem.errors ?? []) {
      if (knownFields.has(error.field)) fieldErrors[error.field as EnquiryField] = error.message;
    }
    return { status: "invalid", fieldErrors, message: problem.detail ?? "Some details need correcting." };
  }

  return { status: "unavailable" };
}
