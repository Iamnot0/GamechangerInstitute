import "server-only";
import { auth } from "@clerk/nextjs/server";
import type {
  AdminPost,
  BlockDetail,
  BlockSummary,
  EnquiryDetail,
  EnquiryFilters,
  EnquiryPage,
  EnquiryStatus,
  EnquirySummary,
  Media,
  MediaKind,
  NewImage,
  PostFields,
} from "@/lib/admin-types";
import type { BlockKey } from "@/lib/site-content";

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
    throw new AdminApiError(503, "The staff service is not reachable right now.");
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as Problem;
    throw new AdminApiError(response.status, problem.detail ?? problem.title ?? "The request failed.", problem.errors);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
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

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const id = encodeURIComponent;

export async function listMedia(kind?: MediaKind): Promise<Media[]> {
  const items: Media[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: "100" });
    if (kind) query.set("kind", kind);
    if (cursor) query.set("cursor", cursor);
    const page: { items: Media[]; next_cursor: string | null } = await request(`/v1/admin/media?${query}`);
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor && items.length < 500);
  return items;
}

export const createImage = (image: NewImage) => request<Media>("/v1/admin/media", json("POST", { kind: "image", ...image }));

export const createVideo = (video: { youtube_url: string; title: string }) =>
  request<Media>("/v1/admin/media", json("POST", { kind: "video", ...video }));

export const updateMedia = (mediaId: string, change: { alt?: string; title?: string }) =>
  request<Media>(`/v1/admin/media/${id(mediaId)}`, json("PATCH", change));

export const deleteMedia = (mediaId: string) => request<void>(`/v1/admin/media/${id(mediaId)}`, { method: "DELETE" });

export async function listBlocks(): Promise<BlockSummary[]> {
  return (await request<{ items: BlockSummary[] }>("/v1/admin/content")).items;
}

export const getBlock = (key: BlockKey) => request<BlockDetail>(`/v1/admin/content/${id(key)}`);

export const saveBlockDraft = (key: BlockKey, data: unknown, expectedVersion: number) =>
  request<BlockDetail>(`/v1/admin/content/${id(key)}`, json("PUT", { data, expected_version: expectedVersion }));

export const publishBlock = (key: BlockKey, expectedVersion: number) =>
  request<BlockDetail>(`/v1/admin/content/${id(key)}/publish`, json("POST", { expected_version: expectedVersion }));

export const discardBlockDraft = (key: BlockKey, expectedVersion: number) =>
  request<BlockDetail>(`/v1/admin/content/${id(key)}/draft`, json("DELETE", { expected_version: expectedVersion }));

export async function listPosts(): Promise<AdminPost[]> {
  return (await request<{ items: AdminPost[] }>("/v1/admin/posts?limit=100")).items;
}

export const getAdminPost = (postId: string) => request<AdminPost>(`/v1/admin/posts/${id(postId)}`);

export const createPost = (fields: PostFields) => request<AdminPost>("/v1/admin/posts", json("POST", fields));

export const updatePost = (postId: string, fields: PostFields, expectedVersion: number) =>
  request<AdminPost>(`/v1/admin/posts/${id(postId)}`, json("PUT", { ...fields, expected_version: expectedVersion }));

export const setPostPublished = (postId: string, published: boolean, expectedVersion: number) =>
  request<AdminPost>(
    `/v1/admin/posts/${id(postId)}/${published ? "publish" : "unpublish"}`,
    json("POST", { expected_version: expectedVersion }),
  );

export const deletePost = (postId: string) => request<void>(`/v1/admin/posts/${id(postId)}`, { method: "DELETE" });
