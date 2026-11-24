import "server-only";
import type {
  AdminPost,
  EnquiryDetail,
  EnquiryFilters,
  EnquiryPage,
  EnquiryStatus,
  EnquirySummary,
  NewPhoto,
  PostFields,
  PostKind,
  PostPhoto,
  StaffRole,
  StaffUserItem,
} from "@/lib/admin-types";
import { getStaffToken } from "@/lib/staff";

// On Vercel the frontend reaches the API privately through the service binding; locally, uvicorn.
const apiBaseUrl = process.env.BACKEND_INTERNAL_URL ?? process.env.ADMIN_API_URL ?? "http://localhost:8000";

export type FieldError = { field: string; message: string };

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: readonly FieldError[] = [],
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

type Problem = { detail?: string; title?: string; errors?: FieldError[] };

async function send<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(new URL(path, apiBaseUrl), {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AdminApiError(503, "The staff service is not reachable right now.");
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as Problem;
    throw new AdminApiError(response.status, problem.detail ?? problem.title ?? "The request failed.", problem.errors);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStaffToken();
  if (!token) throw new AdminApiError(401, "Your session has ended. Sign in again.");
  return send<T>(path, init, token);
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const id = encodeURIComponent;

export type AuthenticatedSession = {
  token: string;
  expires_at: string;
  user: { id: string; email: string; role: StaffRole };
};

export function requestStaffCode(email: string): Promise<{ sent: boolean }> {
  return send<{ sent: boolean }>("/v1/auth/request-code", json("POST", { email }));
}

export function verifyStaffCode(email: string, code: string): Promise<AuthenticatedSession> {
  return send<AuthenticatedSession>("/v1/auth/verify-code", json("POST", { email, code }));
}

export async function revokeStaffSession(token: string): Promise<void> {
  await send<void>("/v1/auth/logout", { method: "POST" }, token).catch(() => undefined);
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

export function getEnquiry(enquiryId: string): Promise<EnquiryDetail> {
  return request<EnquiryDetail>(`/v1/admin/enquiries/${id(enquiryId)}`);
}

export function updateEnquiryStatus(
  enquiryId: string,
  change: { status: EnquiryStatus; expected_status: EnquiryStatus; note: string | null },
): Promise<EnquiryDetail> {
  return request<EnquiryDetail>(`/v1/admin/enquiries/${id(enquiryId)}`, json("PATCH", change));
}

export function deleteEnquiry(enquiryId: string): Promise<void> {
  return request<void>(`/v1/admin/enquiries/${id(enquiryId)}`, { method: "DELETE" });
}

export const createPhoto = (photo: NewPhoto) => request<PostPhoto>("/v1/admin/photos", json("POST", photo));

/** Resolves to the address of the deleted photo's file, as the service recorded it. */
export const deletePhoto = (photoId: string) => request<{ src: string }>(`/v1/admin/photos/${id(photoId)}`, { method: "DELETE" });

export async function listPosts(): Promise<AdminPost[]> {
  const posts: AdminPost[] = [];
  let cursor: string | null = null;
  do {
    const query: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const page = await request<{ items: AdminPost[]; next_cursor: string | null }>(`/v1/admin/posts?limit=100${query}`);
    posts.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return posts;
}

export const getAdminPost = (postId: string) => request<AdminPost>(`/v1/admin/posts/${id(postId)}`);

export const createPost = (kind: PostKind, fields: PostFields) =>
  request<AdminPost>("/v1/admin/posts", json("POST", { kind, ...fields }));

export const updatePost = (postId: string, fields: PostFields, expectedVersion: number) =>
  request<AdminPost>(`/v1/admin/posts/${id(postId)}`, json("PUT", { ...fields, expected_version: expectedVersion }));

export const setPostPublished = (postId: string, published: boolean, expectedVersion: number) =>
  request<AdminPost>(
    `/v1/admin/posts/${id(postId)}/${published ? "publish" : "unpublish"}`,
    json("POST", { expected_version: expectedVersion }),
  );

export const deletePost = (postId: string) => request<void>(`/v1/admin/posts/${id(postId)}`, { method: "DELETE" });

export async function listStaffUsers(): Promise<StaffUserItem[]> {
  return (await request<{ items: StaffUserItem[] }>("/v1/admin/staff")).items;
}

export function createStaffUser(email: string, role: StaffRole): Promise<StaffUserItem> {
  return request<StaffUserItem>("/v1/admin/staff", json("POST", { email, role }));
}

export function deleteStaffUser(userId: string): Promise<void> {
  return request<void>(`/v1/admin/staff/${id(userId)}`, { method: "DELETE" });
}
