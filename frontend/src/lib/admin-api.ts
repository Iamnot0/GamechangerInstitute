import "server-only";
import { auth } from "@clerk/nextjs/server";
import type {
  EnquiryDetail,
  EnquiryFilters,
  EnquiryPage,
  EnquiryStatus,
  EnquirySummary,
} from "@/lib/admin-types";

// On Vercel the frontend reaches the API privately through the service binding; locally, uvicorn.
const apiBaseUrl = process.env.BACKEND_INTERNAL_URL ?? process.env.ADMIN_API_URL ?? "http://localhost:8000";

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

type Problem = { detail?: string; title?: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new AdminApiError(401, "Your session has ended. Sign in again.");

  let response: Response;
  try {
    response = await fetch(new URL(path, apiBaseUrl), {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AdminApiError(503, "The enquiries service is not reachable right now.");
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as Problem;
    throw new AdminApiError(response.status, problem.detail ?? problem.title ?? "The request failed.");
  }
  return (await response.json()) as T;
}

export function listEnquiries(filters: EnquiryFilters): Promise<EnquiryPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  return request<EnquiryPage>(`/v1/admin/enquiries${suffix}`);
}

export function getEnquirySummary(): Promise<EnquirySummary> {
  return request<EnquirySummary>("/v1/admin/enquiries/summary");
}

export function getEnquiry(id: string): Promise<EnquiryDetail> {
  return request<EnquiryDetail>(`/v1/admin/enquiries/${encodeURIComponent(id)}`);
}

export function updateEnquiryStatus(
  id: string,
  change: { status: EnquiryStatus; expected_status: EnquiryStatus; note: string | null },
): Promise<EnquiryDetail> {
  return request<EnquiryDetail>(`/v1/admin/enquiries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(change),
  });
}
