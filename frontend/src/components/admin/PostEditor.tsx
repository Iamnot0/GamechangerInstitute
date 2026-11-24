"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, type DragEvent } from "react";
import { ActionNotice, type Notice } from "@/components/admin/ActionNotice";
import type { AdminPost, PostDocument, PostFields, PostKind, PostPhoto } from "@/lib/admin-types";
import { captureFrame, preparePhoto, storageName, type PreparedImage } from "@/lib/browser-media";
import { formatDay, megabytes } from "@/lib/format";
import { kindLabels } from "@/lib/media-kinds";
import {
  discardPhoto,
  discardUpload,
  recordPhoto,
  removePost,
  savePost,
  unpublishPost,
  type ActionResult,
  type SavedPost,
} from "@/lib/news-actions";

type PostEditorProps = { kind: PostKind; post: AdminPost | null };
type VideoSource = "youtube" | "file";

const photoTypes = ["image/jpeg", "image/png", "image/webp"];
const uploadRoute = "/admin/posts/upload/";
const mostPhotos = 12;
const largestPdfBytes = 20 * 1024 * 1024;
const largestVideoBytes = 200 * 1024 * 1024;

const fileSet = (...urls: (string | null | undefined)[]) => new Set(urls.filter((url): url is string => Boolean(url)));

const reason = (error: unknown) => (error instanceof Error ? error.message : "The upload failed.");

export function PostEditor({ kind, post }: PostEditorProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [eventDate, setEventDate] = useState(post?.event_date ?? "");
  const [source, setSource] = useState<VideoSource>(post?.video_url ? "file" : "youtube");
  const [youtube, setYoutube] = useState(post?.youtube_id ? `https://youtu.be/${post.youtube_id}` : "");
  const [videoUrl, setVideoUrl] = useState(post?.video_url ?? null);
  const [photos, setPhotos] = useState<PostPhoto[]>(post?.photos ?? []);
  const [document, setDocument] = useState<PostDocument | null>(post?.document ?? null);
  const [savedPhotoIds, setSavedPhotoIds] = useState(() => new Set(post?.photos.map((photo) => photo.id)));
  const [savedFiles, setSavedFiles] = useState(() => fileSet(post?.document?.url, post?.video_url));
  const [version, setVersion] = useState(post?.version ?? 0);
  const [published, setPublished] = useState(post?.status === "published");
  const [lastChanged, setLastChanged] = useState(post?.updated_at ?? null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, startTransition] = useTransition();
  const locked = busy || uploading !== null;
  const label = kindLabels[kind];

  const fail = (result: Extract<ActionResult<unknown>, { ok: false }>) =>
    setNotice({
      tone: "error",
      message: result.conflict ? "Someone else changed this. Reload the page to see their version." : result.message,
      fieldErrors: result.conflict ? [] : result.fieldErrors,
    });

  const settle = (result: ActionResult<SavedPost>, message: string) => {
    if (!result.ok) return fail(result);
    setVersion(result.value.version);
    setPublished(result.value.published);
    setLastChanged(result.value.updatedAt);
    setPhotos(result.value.photos);
    setDocument(result.value.document);
    setVideoUrl(result.value.videoUrl);
    setSavedPhotoIds(new Set(result.value.photos.map((photo) => photo.id)));
    setSavedFiles(fileSet(result.value.document?.url, result.value.videoUrl));
    setNotice({ tone: "ok", message });
  };

  const storePhoto = async (image: PreparedImage, fileName: string) => {
    const stored = await upload(storageName("photos", fileName, image.blob.type.split("/")[1]), image.blob, {
      access: "public",
      handleUploadUrl: uploadRoute,
      contentType: image.blob.type,
    });
    const recorded = await recordPhoto({
      url: stored.url,
      content_type: image.blob.type,
      size_bytes: image.blob.size,
      width: image.width,
      height: image.height,
      alt: title.trim() || "Photo from GameChanger Institute media",
    });
    if (!recorded.ok) throw new Error(recorded.message);
    return recorded.value;
  };

  // A file already saved with the post is removed when the post is next saved. One uploaded
  // in this sitting has no post yet, so it is cleared from storage straight away.
  const discardIfUnsaved = (url: string) => {
    if (!savedFiles.has(url)) void discardUpload(url);
  };

  const removePhoto = (photo: PostPhoto) => {
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    if (!savedPhotoIds.has(photo.id)) void discardPhoto(photo.id);
  };

  const addPhotos = async (files: FileList | null) => {
    const chosen = [...(files ?? [])].filter((file) => photoTypes.includes(file.type));
    const room = mostPhotos - photos.length;
    if (files?.length && chosen.length < files.length) setNotice({ tone: "error", message: "Only JPG, PNG and WebP photos can be added." });
    else if (chosen.length > room) setNotice({ tone: "error", message: `An article holds up to ${mostPhotos} photos.` });
    else setNotice(null);

    for (const [index, file] of chosen.slice(0, Math.max(room, 0)).entries()) {
      setUploading(`Uploading photo ${index + 1} of ${Math.min(chosen.length, room)}`);
      try {
        const photo = await storePhoto(await preparePhoto(file), file.name);
        setPhotos((current) => [...current, photo]);
      } catch (error) {
        setNotice({ tone: "error", message: `${file.name} was not added. ${reason(error)}` });
      }
    }
    setUploading(null);
  };

  const addPdf = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") return setNotice({ tone: "error", message: "Choose a PDF file." });
    if (file.size > largestPdfBytes) return setNotice({ tone: "error", message: `A PDF can be up to ${megabytes(largestPdfBytes)}.` });
    setNotice(null);
    setUploading("Uploading the PDF");
    try {
      const stored = await upload(storageName("documents", file.name, "pdf"), file, {
        access: "public",
        handleUploadUrl: uploadRoute,
        contentType: "application/pdf",
      });
      setDocument({ url: stored.url, name: file.name.replace(/\.pdf$/i, "").slice(0, 120) || "Document", size_bytes: file.size });
    } catch (error) {
      setNotice({ tone: "error", message: `${file.name} was not added. ${reason(error)}` });
    }
    setUploading(null);
  };

  const addVideo = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "video/mp4") return setNotice({ tone: "error", message: "Choose an MP4 video. Other formats do not play on every phone." });
    if (file.size > largestVideoBytes) {
      return setNotice({ tone: "error", message: `A video file can be up to ${megabytes(largestVideoBytes)}. Put longer videos on YouTube and paste the link.` });
    }
    setNotice(null);
    try {
      setUploading("Making the thumbnail");
      const thumbnail = await storePhoto(await captureFrame(file), file.name);
      photos.forEach(removePhoto);
      setPhotos([thumbnail]);

      const stored = await upload(storageName("videos", file.name, "mp4"), file, {
        access: "public",
        handleUploadUrl: uploadRoute,
        contentType: "video/mp4",
        multipart: true,
        onUploadProgress: ({ percentage }) => setUploading(`Uploading the video, ${Math.round(percentage)}%`),
      });
      setVideoUrl(stored.url);
    } catch (error) {
      setNotice({ tone: "error", message: `${file.name} was not added. ${reason(error)}` });
    }
    setUploading(null);
  };

  const removeVideo = () => {
    if (videoUrl) discardIfUnsaved(videoUrl);
    setVideoUrl(null);
    photos.forEach(removePhoto);
  };

  // Only one source is kept, so choosing YouTube lets go of a file uploaded for this video.
  const chooseSource = (chosen: VideoSource) => {
    if (chosen === "youtube") removeVideo();
    setSource(chosen);
  };

  const removePdf = () => {
    if (document) discardIfUnsaved(document.url);
    setDocument(null);
  };

  const makeCover = (photo: PostPhoto) => setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]);

  const drop = (handler: (files: FileList) => void) => (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!locked) handler(event.dataTransfer.files);
  };

  const fields = (): PostFields => ({
    title: title.trim(),
    body: body.trim(),
    event_date: kind === "article" ? eventDate || null : null,
    youtube_url: kind === "video" && source === "youtube" ? youtube.trim() || null : null,
    video_url: kind === "video" && source === "file" ? videoUrl : null,
    photo_ids: kind === "document" || (kind === "video" && source === "youtube") ? [] : photos.map((photo) => photo.id),
    document: kind === "video" ? null : document && { ...document, name: document.name.trim() || "Document" },
  });

  const submit = (publish: boolean) =>
    startTransition(async () => {
      const result = await savePost(post ? { id: post.id } : { kind }, fields(), version, publish);
      settle(result, publish || published ? "Saved. It is live on the Media page." : "Draft saved. It is not on the site yet.");
    });

  const unpublish = () =>
    startTransition(async () => {
      if (post) settle(await unpublishPost(post.id, version), "Taken off the Media page. It is kept here as a draft.");
    });

  const remove = () =>
    startTransition(async () => {
      if (!post) return;
      const result = await removePost(post.id);
      if (!result.ok) fail(result);
    });

  const pdfField = (required: boolean) => (
    <div className="form-field">
      <span className="form-field__label">
        PDF file
        {required ? null : <span className="form-field__optional">Optional</span>}
      </span>
      {document ? (
        <div className="post-document">
          <label className="form-field" htmlFor="post-document-name">
            <span className="form-field__hint">Name readers see on the download button</span>
            <input id="post-document-name" className="form-control" type="text" maxLength={120} value={document.name} onChange={(event) => setDocument({ ...document, name: event.target.value })} />
          </label>
          <p className="post-document__meta">
            <a href={document.url} target="_blank" rel="noreferrer">
              Open the PDF
            </a>{" "}
            · {megabytes(document.size_bytes)}
          </p>
          <button type="button" className="text-button text-button--danger" disabled={locked} onClick={removePdf}>
            Remove
          </button>
        </div>
      ) : (
        <label className="uploader__drop" onDragOver={(event) => event.preventDefault()} onDrop={drop((files) => void addPdf(files[0]))}>
          <input
            type="file"
            className="uploader__input"
            accept="application/pdf"
            disabled={locked}
            onChange={(event) => {
              void addPdf(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <strong>Drag a PDF here, or choose a file</strong>
          <span>Up to {megabytes(largestPdfBytes)}.</span>
        </label>
      )}
    </div>
  );

  const photosField = (
    <div className="form-field">
      <span className="form-field__hint">The first one is the cover. Up to {mostPhotos}.</span>
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
      <label className="uploader__drop" onDragOver={(event) => event.preventDefault()} onDrop={drop((files) => void addPhotos(files))}>
        <input
          type="file"
          className="uploader__input"
          accept={photoTypes.join(",")}
          multiple
          disabled={locked || photos.length >= mostPhotos}
          onChange={(event) => {
            void addPhotos(event.target.files);
            event.target.value = "";
          }}
        />
        <strong>Drag photos here, or choose files</strong>
        <span>JPG, PNG or WebP. Large photos are resized automatically.</span>
      </label>
    </div>
  );

  return (
    <form
      className="post-editor"
      onSubmit={(event) => {
        event.preventDefault();
        submit(true);
      }}
    >
      <div className="post-editor__main">
        <section className="editor-card" aria-labelledby="editor-details">
          <h2 id="editor-details" className="editor-card__title">
            {label.name} details
          </h2>
          <label className="form-field" htmlFor="post-title">
            <span className="form-field__label">Title</span>
            <input id="post-title" className="form-control" type="text" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          {kind === "article" ? (
            <>
              <label className="form-field" htmlFor="post-body">
                <span className="form-field__label">Text</span>
                <textarea id="post-body" className="form-control" rows={16} required maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} />
                <span className="form-field__hint">Leave an empty line between paragraphs.</span>
              </label>
              <label className="form-field post-editor__date" htmlFor="post-date">
                <span className="form-field__label">
                  Event date<span className="form-field__optional">Optional</span>
                </span>
                <input id="post-date" className="form-control" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
              </label>
            </>
          ) : null}

          {kind === "video" ? (
            <>
              <fieldset className="source-chooser">
                <legend className="form-field__label">Where is the video?</legend>
                <div className="source-chooser__options">
                  {(["youtube", "file"] as const).map((option) => (
                    <label key={option} className="source-chooser__option">
                      <input type="radio" name="video-source" className="source-chooser__input" checked={source === option} disabled={locked} onChange={() => chooseSource(option)} />
                      <span className="source-chooser__title">{option === "youtube" ? "On YouTube" : "A file on this computer"}</span>
                      <span className="source-chooser__detail">{option === "youtube" ? "Paste the link." : `Upload an MP4, up to ${megabytes(largestVideoBytes)}.`}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {source === "youtube" ? (
                <label className="form-field" htmlFor="post-video">
                  <span className="form-field__label">YouTube link</span>
                  <input id="post-video" className="form-control" type="url" inputMode="url" required maxLength={200} placeholder="https://youtu.be/…" value={youtube} onChange={(event) => setYoutube(event.target.value)} />
                  <span className="form-field__hint">The video stays on YouTube and plays inside the site.</span>
                </label>
              ) : (
                <div className="form-field">
                  <span className="form-field__label">Video file</span>
                  {videoUrl ? (
                    <div className="post-document">
                      <video className="post-video__preview" src={videoUrl} poster={photos[0]?.src} controls preload="metadata" />
                      <button type="button" className="text-button text-button--danger" disabled={locked} onClick={removeVideo}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="uploader__drop" onDragOver={(event) => event.preventDefault()} onDrop={drop((files) => void addVideo(files[0]))}>
                      <input
                        type="file"
                        className="uploader__input"
                        accept="video/mp4"
                        disabled={locked}
                        onChange={(event) => {
                          void addVideo(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <strong>Drag an MP4 here, or choose a file</strong>
                      <span>Up to {megabytes(largestVideoBytes)}. A thumbnail is made automatically.</span>
                    </label>
                  )}
                </div>
              )}

              <label className="form-field" htmlFor="post-body">
                <span className="form-field__label">
                  About the video<span className="form-field__optional">Optional</span>
                </span>
                <textarea id="post-body" className="form-control" rows={4} maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} />
              </label>
            </>
          ) : null}

          {kind === "document" ? (
            <>
              {pdfField(true)}
              <label className="form-field" htmlFor="post-body">
                <span className="form-field__label">
                  One line about it<span className="form-field__optional">Optional</span>
                </span>
                <input id="post-body" className="form-control" type="text" maxLength={300} value={body} onChange={(event) => setBody(event.target.value)} />
              </label>
            </>
          ) : null}
        </section>
      </div>

      <div className="post-editor__side">
        <section className="editor-card" aria-labelledby="editor-publishing">
          <h2 id="editor-publishing" className="editor-card__title">
            Publishing
          </h2>
          <dl className="editor-card__facts">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-badge ${published ? "status-badge--live" : "status-badge--draft"}`}>{published ? "On the site" : "Draft"}</span>
              </dd>
            </div>
            {lastChanged ? (
              <div>
                <dt>Last changed</dt>
                <dd>{formatDay(lastChanged)}</dd>
              </div>
            ) : null}
          </dl>

          {uploading ? (
            <p className="post-editor__progress" role="status">
              {uploading}
            </p>
          ) : null}
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
            {post ? (
              <Link href={`/admin/posts/${post.id}/preview/`} className="text-button">
                Preview the saved version
              </Link>
            ) : null}
            {post && !confirming ? (
              <button type="button" className="text-button text-button--danger" disabled={locked} onClick={() => setConfirming(true)}>
                Delete this {label.name.toLowerCase()}
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
        </section>

        {kind === "article" ? (
          <>
            <section className="editor-card" aria-labelledby="editor-photos">
              <h2 id="editor-photos" className="editor-card__title">
                Photos<span className="form-field__optional">Optional</span>
              </h2>
              {photosField}
            </section>
            <section className="editor-card" aria-labelledby="editor-attachment">
              <h2 id="editor-attachment" className="editor-card__title">
                Attachment
              </h2>
              {pdfField(false)}
            </section>
          </>
        ) : null}
      </div>
    </form>
  );
}
