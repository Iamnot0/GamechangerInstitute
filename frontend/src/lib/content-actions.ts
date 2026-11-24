"use server";

import { del, head } from "@vercel/blob";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/admin-api";
import { AdminApiError, type FieldError } from "@/lib/admin-api";
import type { BlockData, BlockDetail, Media, NewImage, PostFields } from "@/lib/admin-types";
import { contentTag, postsTag, type BlockKey } from "@/lib/site-content";
import { getStaffSession } from "@/lib/staff";

export type ActionResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; message: string; fieldErrors: readonly FieldError[]; conflict: boolean };

/** Every action is a public endpoint in its own right, so each one proves the caller is staff
    before it touches storage or the staff service, and again the service checks for itself. */
async function attempt<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    if (!(await getStaffSession()).isStaff) throw new AdminApiError(403, "Only staff can do this.");
    return { ok: true, value: await work() };
  } catch (error) {
    if (!(error instanceof AdminApiError)) throw error;
    return { ok: false, message: error.message, fieldErrors: error.fieldErrors, conflict: error.status === 409 };
  }
}

const uploadFolder = "photos/";
const uploadOrigin = process.env.MEDIA_HOST ? `https://${process.env.MEDIA_HOST.trim()}/${uploadFolder}` : null;

/** True only for an address inside this site's own upload folder; nothing else is ever sent to storage. */
const isOwnUpload = (url: unknown): url is string =>
  typeof url === "string" && uploadOrigin !== null && url.startsWith(uploadOrigin) && !/[?#\\\s]|\/\.{1,2}(\/|$)/.test(url);

const refreshMedia = () => revalidatePath("/admin/media/");
const refreshBlock = (key: BlockKey) => {
  revalidatePath("/admin/content/");
  revalidatePath(`/admin/content/${key}/`);
};

/** The browser reports where it put the file; storage is asked what is really there before anything is recorded. */
export async function addImage(image: NewImage): Promise<ActionResult<Media>> {
  const result = await attempt(async () => {
    const stored = isOwnUpload(image?.url) ? await head(image.url).catch(() => null) : null;
    if (!stored || !stored.pathname.startsWith(uploadFolder)) {
      throw new AdminApiError(422, "This photo was not found in the site's storage. Upload it again.");
    }
    return api.createImage({ ...image, url: stored.url, content_type: stored.contentType, size_bytes: stored.size });
  });
  if (result.ok) refreshMedia();
  return result;
}

export async function addVideo(video: { youtube_url: string; title: string }): Promise<ActionResult<Media>> {
  const result = await attempt(() => api.createVideo(video));
  if (result.ok) refreshMedia();
  return result;
}

export async function describeMedia(id: string, change: { alt?: string; title?: string }): Promise<ActionResult<Media>> {
  const result = await attempt(() => api.updateMedia(id, change));
  if (result.ok) {
    refreshMedia();
    updateTag(contentTag);
    updateTag(postsTag);
  }
  return result;
}

/** The library holds one record per file, and the record goes first: once nothing points at
    the file, removing it from this site's own storage cannot break a page. */
export async function removeMedia(id: string): Promise<ActionResult> {
  const result = await attempt(async () => {
    const media = (await api.listMedia()).find((item) => item.id === id);
    const stored = media?.kind === "image" && isOwnUpload(media.url) ? await head(media.url).catch(() => null) : null;
    await api.deleteMedia(id);
    if (stored && stored.url === media?.url) await del(stored.url).catch(() => undefined);
  });
  if (result.ok) refreshMedia();
  return result;
}

export async function saveDraft(key: BlockKey, data: BlockData, version: number): Promise<ActionResult<BlockDetail>> {
  const result = await attempt(() => api.saveBlockDraft(key, data, version));
  if (result.ok) refreshBlock(key);
  return result;
}

export async function publishDraft(key: BlockKey, version: number): Promise<ActionResult<BlockDetail>> {
  const result = await attempt(() => api.publishBlock(key, version));
  if (result.ok) {
    refreshBlock(key);
    updateTag(contentTag);
  }
  return result;
}

export async function discardDraft(key: BlockKey, version: number): Promise<ActionResult<BlockDetail>> {
  const result = await attempt(() => api.discardBlockDraft(key, version));
  if (result.ok) refreshBlock(key);
  return result;
}

export async function savePost(id: string | null, fields: PostFields, version: number): Promise<ActionResult<{ id: string; version: number }>> {
  const result = await attempt(() => (id ? api.updatePost(id, fields, version) : api.createPost(fields)));
  if (!result.ok) return result;
  revalidatePath("/admin/posts/");
  if (result.value.status === "published") updateTag(postsTag);
  if (!id) redirect(`/admin/posts/${result.value.id}/`);
  return { ok: true, value: { id: result.value.id, version: result.value.version } };
}

export async function publishPost(id: string, published: boolean, version: number): Promise<ActionResult<{ version: number }>> {
  const result = await attempt(() => api.setPostPublished(id, published, version));
  if (!result.ok) return result;
  revalidatePath("/admin/posts/");
  revalidatePath(`/admin/posts/${id}/`);
  updateTag(postsTag);
  return { ok: true, value: { version: result.value.version } };
}

export async function removePost(id: string): Promise<ActionResult> {
  const result = await attempt(() => api.deletePost(id));
  if (!result.ok) return result;
  updateTag(postsTag);
  revalidatePath("/admin/posts/");
  redirect("/admin/posts/");
}
