"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { ActionNotice, type Notice } from "@/components/admin/ActionNotice";
import type { AdminPost, PostDocument, PostFields, PostPhoto } from "@/lib/admin-types";
import { discardPhoto, recordPhoto, removePost, savePost, unpublishPost, type ActionResult, type SavedPost } from "@/lib/news-actions";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const uploadRoute = "/admin/posts/upload/";
const longestEdge = 1920;
const mostPhotos = 12;
const largestPdfBytes = 20 * 1024 * 1024;

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Phone photos are far larger than a web page needs, so each one is scaled and re-encoded before it leaves the browser. */
async function prepare(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, longestEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare photos for upload.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Browsers that cannot write WebP answer with PNG, which is kept.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
  if (!blob) throw new Error(`${file.name} could not be read as a photo.`);
  return { blob, width: canvas.width, height: canvas.height };
}

const storageName = (folder: string, file: File, extension: string) =>
  `${folder}/${file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file"}.${extension}`;

export function PostEditor({ post }: { post: AdminPost | null }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [eventDate, setEventDate] = useState(post?.event_date ?? "");
  const [video, setVideo] = useState(post?.youtube_id ? `https://youtu.be/${post.youtube_id}` : "");
  const [photos, setPhotos] = useState<PostPhoto[]>(post?.photos ?? []);
  const [document, setDocument] = useState<PostDocument | null>(post?.document ?? null);
  const [savedPhotoIds, setSavedPhotoIds] = useState(() => new Set(post?.photos.map((photo) => photo.id)));
  const [version, setVersion] = useState(post?.version ?? 0);
  const [published, setPublished] = useState(post?.status === "published");
  const [uploading, setUploading] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement>(null);
  const locked = busy || uploading > 0;

  const fail = (result: Extract<ActionResult<unknown>, { ok: false }>) =>
    setNotice({
      tone: "error",
      message: result.conflict ? "Someone else changed this post. Reload the page to see their version." : result.message,
      fieldErrors: result.conflict ? [] : result.fieldErrors,
    });

  const settle = (result: ActionResult<SavedPost>, message: string) => {
    if (!result.ok) return fail(result);
    setVersion(result.value.version);
    setPublished(result.value.published);
    setPhotos(result.value.photos);
    setDocument(result.value.document);
    setSavedPhotoIds(new Set(result.value.photos.map((photo) => photo.id)));
    setNotice({ tone: "ok", message });
  };

  const addPhotos = async (files: FileList | null) => {
    const chosen = [...(files ?? [])].filter((file) => acceptedTypes.includes(file.type));
    const room = mostPhotos - photos.length;
    if (files?.length && chosen.length < files.length) setNotice({ tone: "error", message: "Only JPG, PNG and WebP photos can be added." });
    else if (chosen.length > room) setNotice({ tone: "error", message: `A post holds up to ${mostPhotos} photos.` });
    else setNotice(null);

    for (const file of chosen.slice(0, Math.max(room, 0))) {
      setUploading((count) => count + 1);
      try {
        const { blob, width, height } = await prepare(file);
        const stored = await upload(storageName("photos", file, blob.type.split("/")[1]), blob, {
          access: "public",
          handleUploadUrl: uploadRoute,
          contentType: blob.type,
        });
        const recorded = await recordPhoto({
          url: stored.url,
          content_type: blob.type,
          size_bytes: blob.size,
          width,
          height,
          alt: title.trim() || "Photo from GameChanger Institute news",
        });
        if (!recorded.ok) throw new Error(recorded.message);
        setPhotos((current) => [...current, recorded.value]);
      } catch (error) {
        setNotice({ tone: "error", message: `${file.name} was not added. ${error instanceof Error ? error.message : "The upload failed."}` });
      } finally {
        setUploading((count) => count - 1);
      }
    }
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    void addPhotos(event.dataTransfer.files);
  };

  // A photo already saved with the post is removed when the post is next saved. One uploaded
  // in this sitting has no post yet, so it is cleared from storage straight away.
  const removePhoto = (photo: PostPhoto) => {
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    if (!savedPhotoIds.has(photo.id)) void discardPhoto(photo.id);
  };

  const addPdf = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") return setNotice({ tone: "error", message: "Choose a PDF file." });
    if (file.size > largestPdfBytes) return setNotice({ tone: "error", message: `A PDF can be up to ${megabytes(largestPdfBytes)}.` });
    setNotice(null);
    setUploading((count) => count + 1);
    try {
      const stored = await upload(storageName("documents", file, "pdf"), file, { access: "public", handleUploadUrl: uploadRoute, contentType: "application/pdf" });
      setDocument({ url: stored.url, name: file.name.replace(/\.pdf$/i, "").slice(0, 120) || "Document", size_bytes: file.size });
    } catch (error) {
      setNotice({ tone: "error", message: `${file.name} was not added. ${error instanceof Error ? error.message : "The upload failed."}` });
    } finally {
      setUploading((count) => count - 1);
    }
  };

  const makeCover = (photo: PostPhoto) => setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]);

  const fields = (): PostFields => ({
    title: title.trim(),
    body: body.trim(),
    event_date: eventDate || null,
    youtube_url: video.trim() || null,
    photo_ids: photos.map((photo) => photo.id),
    document: document && { ...document, name: document.name.trim() || "Document" },
  });

  const submit = (publish: boolean) =>
    startTransition(async () => {
      const result = await savePost(post?.id ?? null, fields(), version, publish);
      settle(result, publish || published ? "Saved. It is live on the News page." : "Draft saved. It is not on the site yet.");
    });

  const unpublish = () =>
    startTransition(async () => {
      if (post) settle(await unpublishPost(post.id, version), "Taken off the News page. It is kept here as a draft.");
    });

  const remove = () =>
    startTransition(async () => {
      if (!post) return;
      const result = await removePost(post.id);
      if (!result.ok) fail(result);
    });

  return (
    <form
      className="post-editor"
      onSubmit={(event) => {
        event.preventDefault();
        submit(true);
      }}
    >
      <div className="post-editor__fields">
        <label className="form-field" htmlFor="post-title">
          <span className="form-field__label">Title</span>
          <input id="post-title" className="form-control" type="text" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="form-field" htmlFor="post-body">
          <span className="form-field__label">
            Text<span className="form-field__optional">Optional</span>
          </span>
          <textarea id="post-body" className="form-control" rows={8} maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} />
          <span className="form-field__hint">Leave an empty line between paragraphs.</span>
        </label>

        <label className="form-field post-editor__date" htmlFor="post-date">
          <span className="form-field__label">
            Event date<span className="form-field__optional">Optional</span>
          </span>
          <input id="post-date" className="form-control" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
        </label>

        <div className="form-field">
          <span className="form-field__label">
            Photos<span className="form-field__optional">Optional, up to {mostPhotos}</span>
          </span>
          {photos.length > 0 ? (
            <ul className="post-photos">
              {photos.map((photo, index) => (
                <li key={photo.id} className="post-photos__item">
                  <Image src={photo.src} width={photo.width} height={photo.height} alt="" className="post-photos__thumb" />
                  <div className="post-photos__tools">
                    {index === 0 ? (
                      <span className="post-photos__cover">Cover</span>
                    ) : (
                      <button type="button" className="text-button" disabled={locked} onClick={() => makeCover(photo)}>
                        Make cover
                      </button>
                    )}
                    <button type="button" className="text-button text-button--danger" disabled={locked} onClick={() => removePhoto(photo)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <label className="uploader__drop" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
            <input
              ref={picker}
              type="file"
              className="uploader__input"
              accept={acceptedTypes.join(",")}
              multiple
              disabled={photos.length >= mostPhotos}
              onChange={(event) => {
                void addPhotos(event.target.files);
                event.target.value = "";
              }}
            />
            <strong>{uploading > 0 ? `Uploading ${uploading}` : "Drag photos here, or choose files"}</strong>
            <span>JPG, PNG or WebP. Large photos are resized automatically.</span>
          </label>
        </div>

        <label className="form-field" htmlFor="post-video">
          <span className="form-field__label">
            YouTube link<span className="form-field__optional">Optional</span>
          </span>
          <input id="post-video" className="form-control" type="url" inputMode="url" maxLength={200} placeholder="https://youtu.be/…" value={video} onChange={(event) => setVideo(event.target.value)} />
          <span className="form-field__hint">Paste the link. The video plays inside the post.</span>
        </label>

        <div className="form-field">
          <span className="form-field__label">
            PDF<span className="form-field__optional">Optional, up to {megabytes(largestPdfBytes)}</span>
          </span>
          {document ? (
            <div className="post-document">
              <label className="form-field" htmlFor="post-document-name">
                <span className="form-field__hint">Name readers see on the download link</span>
                <input id="post-document-name" className="form-control" type="text" maxLength={120} value={document.name} onChange={(event) => setDocument({ ...document, name: event.target.value })} />
              </label>
              <p className="post-document__meta">
                <a href={document.url} target="_blank" rel="noreferrer">
                  Open the PDF
                </a>{" "}
                · {megabytes(document.size_bytes)}
              </p>
              <button type="button" className="text-button text-button--danger" disabled={locked} onClick={() => setDocument(null)}>
                Remove
              </button>
            </div>
          ) : (
            <input
              className="form-control post-document__picker"
              type="file"
              accept="application/pdf"
              disabled={locked}
              aria-label="Choose a PDF"
              onChange={(event) => {
                void addPdf(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          )}
        </div>
      </div>

      <ActionNotice notice={notice} />

      <div className="post-editor__actions">
        <button type="submit" className="button button--primary" disabled={locked}>
          {published ? "Save changes" : "Publish"}
        </button>
        {published ? (
          <button type="button" className="button button--secondary" disabled={locked} onClick={unpublish}>
            Take off the site
          </button>
        ) : (
          <button type="button" className="button button--secondary" disabled={locked || title.trim() === ""} onClick={() => submit(false)}>
            Save as draft
          </button>
        )}
        {post && !confirming ? (
          <button type="button" className="text-button text-button--danger" disabled={locked} onClick={() => setConfirming(true)}>
            Delete post
          </button>
        ) : null}
        {confirming ? (
          <>
            <button type="button" className="text-button text-button--danger" disabled={locked} onClick={remove}>
              Yes, delete it
            </button>
            <button type="button" className="text-button" disabled={locked} onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
