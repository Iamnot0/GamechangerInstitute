"use server";

import { del, head } from "@vercel/blob";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/admin-api";
import { AdminApiError, type FieldError } from "@/lib/admin-api";
import type { AdminPost, NewPhoto, PostDocument, PostFields, PostKind, PostPhoto } from "@/lib/admin-types";
import { postsTag } from "@/lib/news";
import { getStaffSession } from "@/lib/staff";

export type ActionResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; message: string; fieldErrors: readonly FieldError[]; conflict: boolean };

export type SavedPost = {
  id: string;
  version: number;
  published: boolean;
  photos: PostPhoto[];
  document: PostDocument | null;
  videoUrl: string | null;
};

const photoFolder = "photos/";
const documentFolder = "documents/";
const videoFolder = "videos/";
const storageOrigin = process.env.MEDIA_HOST ? `https://${process.env.MEDIA_HOST.trim()}/` : null;

/** True only for an address inside one of this site's own upload folders; nothing else is ever sent to storage. */
const isOwnUpload = (url: unknown, folder: string): url is string =>
  typeof url === "string" && storageOrigin !== null && url.startsWith(storageOrigin + folder) && !/[?#\\\s]|\/\.{1,2}(\/|$)/.test(url);

const isOwnFile = (url: unknown): url is string =>
  [photoFolder, documentFolder, videoFolder].some((folder) => isOwnUpload(url, folder));

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

/** An uploaded video is recorded with the post itself, so it too is confirmed with storage when the post is saved. */
async function confirmVideo(url: string | null): Promise<string | null> {
  if (!url) return null;
  const stored = isOwnUpload(url, videoFolder) ? await head(url).catch(() => null) : null;
  if (!stored || stored.contentType !== "video/mp4") {
    throw new AdminApiError(422, "This video was not found in the site's storage. Upload it again.");
  }
  return stored.url;
}

/** For a photo that was uploaded and then taken out again before the post was saved. The file
    to remove is the one the service says belonged to that record, never one the browser names. */
export async function discardPhoto(photoId: string): Promise<ActionResult> {
  return attempt(async () => {
    const deleted = await api.deletePhoto(photoId);
    await removeFiles([deleted.src]);
  });
}

/** For a PDF or video that was uploaded and then taken out again before the post was saved.
    The browser names the file here, so it is removed only when no post refers to it. */
export async function discardUpload(url: string): Promise<ActionResult> {
  return attempt(async () => {
    if (!isOwnUpload(url, documentFolder) && !isOwnUpload(url, videoFolder)) return;
    const posts = await api.listPosts();
    if (posts.some((post) => post.document?.url === url || post.video_url === url)) return;
    await removeFiles([url]);
  });
}

const saved = (post: AdminPost): SavedPost => ({
  id: post.id,
  version: post.version,
  published: post.status === "published",
  photos: post.photos,
  document: post.document,
  videoUrl: post.video_url,
});

const refresh = (published: boolean) => {
  revalidatePath("/admin/posts/");
  if (published) updateTag(postsTag);
};

export async function savePost(
  target: { id: string } | { kind: PostKind },
  fields: PostFields,
  version: number,
  publish: boolean,
): Promise<ActionResult<SavedPost>> {
  const id = "id" in target ? target.id : null;
  const result = await attempt(async () => {
    const before = id ? await api.getAdminPost(id) : null;
    const checked = {
      ...fields,
      document: await confirmDocument(fields.document),
      video_url: await confirmVideo(fields.video_url),
    };
    let post = "id" in target ? await api.updatePost(target.id, checked, version) : await api.createPost(target.kind, checked);
    if (publish && post.status !== "published") post = await api.setPostPublished(post.id, true, post.version);

    const kept = new Set(post.photos.map((photo) => photo.id));
    const dropped = (before?.photos ?? []).filter((photo) => !kept.has(photo.id)).map((photo) => photo.src);
    if (before?.document && before.document.url !== post.document?.url) dropped.push(before.document.url);
    if (before?.video_url && before.video_url !== post.video_url) dropped.push(before.video_url);
    await removeFiles(dropped);
    return post;
  });
  if (!result.ok) return result;

  const published = result.value.status === "published";
  refresh(published);
  if (!id) redirect("/admin/posts/");
  revalidatePath(`/admin/posts/${id}/`);
  return { ok: true, value: saved(result.value) };
}

export async function unpublishPost(id: string, version: number): Promise<ActionResult<SavedPost>> {
  const result = await attempt(() => api.setPostPublished(id, false, version));
  if (!result.ok) return result;
  refresh(true);
  revalidatePath(`/admin/posts/${id}/`);
  return { ok: true, value: saved(result.value) };
}

export async function removePost(id: string): Promise<ActionResult> {
  const result = await attempt(async () => {
    const post = await api.getAdminPost(id);
    await api.deletePost(id);
    await removeFiles([
      ...post.photos.map((photo) => photo.src),
      ...(post.document ? [post.document.url] : []),
      ...(post.video_url ? [post.video_url] : []),
    ]);
  });
  if (!result.ok) return result;
  refresh(true);
  redirect("/admin/posts/");
}
