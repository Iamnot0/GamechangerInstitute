"use server";

import { del, head } from "@vercel/blob";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/admin-api";
import { AdminApiError, type FieldError } from "@/lib/admin-api";
import type { NewPhoto, PostDocument, PostFields, PostPhoto } from "@/lib/admin-types";
import { postsTag } from "@/lib/news";
import { getStaffSession } from "@/lib/staff";

export type ActionResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; message: string; fieldErrors: readonly FieldError[]; conflict: boolean };

export type SavedPost = { id: string; version: number; published: boolean; photos: PostPhoto[]; document: PostDocument | null };

const photoFolder = "photos/";
const documentFolder = "documents/";
const storageOrigin = process.env.MEDIA_HOST ? `https://${process.env.MEDIA_HOST.trim()}/` : null;

/** True only for an address inside one of this site's own upload folders; nothing else is ever sent to storage. */
const isOwnUpload = (url: unknown, folder: string): url is string =>
  typeof url === "string" && storageOrigin !== null && url.startsWith(storageOrigin + folder) && !/[?#\\\s]|\/\.{1,2}(\/|$)/.test(url);

const isOwnFile = (url: unknown): url is string => isOwnUpload(url, photoFolder) || isOwnUpload(url, documentFolder);

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

/** Removes files whose records are already gone. Each address is confirmed with storage first,
    so only files this site owns, at exactly the recorded address, are ever deleted. */
async function removeFiles(urls: readonly string[]) {
  await Promise.all(
    urls.filter(isOwnFile).map(async (url) => {
      const stored = await head(url).catch(() => null);
      if (stored?.url === url) await del(url).catch(() => undefined);
    }),
  );
}

/** The browser reports where it put the file; storage is asked what is really there before anything is recorded. */
export async function recordPhoto(photo: NewPhoto): Promise<ActionResult<PostPhoto>> {
  return attempt(async () => {
    const stored = isOwnUpload(photo?.url, photoFolder) ? await head(photo.url).catch(() => null) : null;
    if (!stored) {
      throw new AdminApiError(422, "This photo was not found in the site's storage. Upload it again.");
    }
    return api.createPhoto({ ...photo, url: stored.url, content_type: stored.contentType, size_bytes: stored.size });
  });
}

/** A PDF is recorded with the post itself, so it is confirmed with storage at the moment the post is saved. */
async function confirmDocument(document: PostDocument | null): Promise<PostDocument | null> {
  if (!document) return null;
  const stored = isOwnUpload(document.url, documentFolder) ? await head(document.url).catch(() => null) : null;
  if (!stored || stored.contentType !== "application/pdf") {
    throw new AdminApiError(422, "This PDF was not found in the site's storage. Upload it again.");
  }
  return { url: stored.url, name: String(document.name).trim().slice(0, 120), size_bytes: stored.size };
}

/** For a photo that was uploaded and then taken out again before the post was saved. */
export async function discardPhoto(photo: Pick<PostPhoto, "id" | "src">): Promise<ActionResult> {
  return attempt(async () => {
    await api.deletePhoto(photo.id);
    await removeFiles([photo.src]);
  });
}

const refresh = (published: boolean) => {
  revalidatePath("/admin/posts/");
  if (published) updateTag(postsTag);
};

export async function savePost(id: string | null, fields: PostFields, version: number, publish: boolean): Promise<ActionResult<SavedPost>> {
  const result = await attempt(async () => {
    const before = id ? await api.getAdminPost(id) : null;
    const checked = { ...fields, document: await confirmDocument(fields.document) };
    let post = id ? await api.updatePost(id, checked, version) : await api.createPost(checked);
    if (publish && post.status !== "published") post = await api.setPostPublished(post.id, true, post.version);

    const kept = new Set(post.photos.map((photo) => photo.id));
    const dropped = (before?.photos ?? []).filter((photo) => !kept.has(photo.id)).map((photo) => photo.src);
    if (before?.document && before.document.url !== post.document?.url) dropped.push(before.document.url);
    await removeFiles(dropped);
    return post;
  });
  if (!result.ok) return result;

  const published = result.value.status === "published";
  refresh(published);
  if (!id) redirect("/admin/posts/");
  revalidatePath(`/admin/posts/${id}/`);
  return { ok: true, value: { id: result.value.id, version: result.value.version, published, photos: result.value.photos, document: result.value.document } };
}

export async function unpublishPost(id: string, version: number): Promise<ActionResult<SavedPost>> {
  const result = await attempt(() => api.setPostPublished(id, false, version));
  if (!result.ok) return result;
  refresh(true);
  revalidatePath(`/admin/posts/${id}/`);
  return { ok: true, value: { id, version: result.value.version, published: false, photos: result.value.photos, document: result.value.document } };
}

export async function removePost(id: string): Promise<ActionResult> {
  const result = await attempt(async () => {
    const post = await api.getAdminPost(id);
    await api.deletePost(id);
    await removeFiles([...post.photos.map((photo) => photo.src), ...(post.document ? [post.document.url] : [])]);
  });
  if (!result.ok) return result;
  refresh(true);
  redirect("/admin/posts/");
}
