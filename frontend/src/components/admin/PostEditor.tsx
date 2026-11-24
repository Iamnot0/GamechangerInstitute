"use client";

import { useState, useTransition } from "react";
import { ActionNotice, type Notice } from "@/components/admin/ActionNotice";
import { MediaPicker } from "@/components/admin/MediaPicker";
import type { FieldError } from "@/lib/admin-api";
import type { AdminPost, Media, PostFields } from "@/lib/admin-types";
import { publishPost, removePost, savePost } from "@/lib/content-actions";

type PostEditorProps = { post: AdminPost | null; images: readonly Media[]; videos: readonly Media[] };

const blank: PostFields = { title: "", summary: "", body: "", slug: "", event_date: null, cover_media_id: null, video_media_id: null };

export function PostEditor({ post, images, videos }: PostEditorProps) {
  const [fields, setFields] = useState<PostFields>(post ?? blank);
  const [version, setVersion] = useState(post?.version ?? 0);
  const [published, setPublished] = useState(post?.status === "published");
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, startTransition] = useTransition();
  const slugFixed = Boolean(post?.published_at);

  const set = <K extends keyof PostFields>(name: K, value: PostFields[K]) => {
    setFields((current) => ({ ...current, [name]: value }));
    setDirty(true);
    setNotice(null);
  };

  const payload = (): PostFields => ({
    title: fields.title.trim(),
    summary: fields.summary.trim(),
    body: fields.body.trim(),
    ...(fields.slug?.trim() ? { slug: fields.slug.trim() } : {}),
    event_date: fields.event_date || null,
    cover_media_id: fields.cover_media_id || null,
    video_media_id: fields.video_media_id || null,
  });

  const fail = (message: string, conflict: boolean, fieldErrors: readonly FieldError[]) =>
    setNotice({ tone: "error", message: conflict ? "Someone else changed this post. Reload the page to see their version." : message, fieldErrors });

  const save = () =>
    startTransition(async () => {
      const result = await savePost(post?.id ?? null, payload(), version);
      if (!result.ok) return fail(result.message, result.conflict, result.fieldErrors);
      setVersion(result.value.version);
      setDirty(false);
      setNotice({ tone: "ok", message: published ? "Saved. The public page is updated." : "Draft saved." });
    });

  const togglePublished = () =>
    startTransition(async () => {
      if (!post) return;
      let latest = version;
      if (dirty) {
        const saved = await savePost(post.id, payload(), version);
        if (!saved.ok) return fail(saved.message, saved.conflict, saved.fieldErrors);
        latest = saved.value.version;
        setDirty(false);
      }
      const result = await publishPost(post.id, !published, latest);
      if (!result.ok) return fail(result.message, result.conflict, result.fieldErrors);
      setVersion(result.value.version);
      setPublished(!published);
      setNotice({ tone: "ok", message: published ? "Unpublished. The post is no longer on the public site." : "Published on News and events." });
    });

  const remove = () =>
    startTransition(async () => {
      if (!post) return;
      const result = await removePost(post.id);
      if (!result.ok) fail(result.message, result.conflict, result.fieldErrors);
    });

  return (
    <form
      className="post-editor"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="block-editor__bar">
        <span className={`status-badge ${published && !dirty ? "status-badge--live" : "status-badge--draft"}`}>
          {dirty ? "Unsaved changes" : published ? "Published" : post ? "Draft, not live" : "New post"}
        </span>
        <div className="block-editor__actions">
          {post && !confirming ? (
            <button type="button" className="text-button text-button--danger" disabled={busy} onClick={() => setConfirming(true)}>
              Delete
            </button>
          ) : null}
          {confirming ? (
            <>
              <button type="button" className="text-button text-button--danger" disabled={busy} onClick={remove}>
                Confirm delete
              </button>
              <button type="button" className="text-button" disabled={busy} onClick={() => setConfirming(false)}>
                Keep
              </button>
            </>
          ) : null}
          <button type="submit" className="button button--secondary" disabled={busy || (post !== null && !dirty)}>
            {post ? "Save" : "Save draft"}
          </button>
          {post ? (
            <button type="button" className="button button--primary" disabled={busy} onClick={togglePublished}>
              {published ? "Unpublish" : "Publish"}
            </button>
          ) : null}
        </div>
      </div>
      <ActionNotice notice={notice} />

      <div className="post-editor__fields">
        <label className="form-field" htmlFor="post-title">
          <span className="form-field__label">Title</span>
          <input id="post-title" className="form-control" type="text" required maxLength={120} value={fields.title} onChange={(event) => set("title", event.target.value)} />
        </label>
        <label className="form-field" htmlFor="post-summary">
          <span className="form-field__label">Summary</span>
          <textarea id="post-summary" className="form-control" rows={2} required maxLength={300} value={fields.summary} onChange={(event) => set("summary", event.target.value)} />
          <span className="form-field__hint">One or two sentences shown on the News and events list.</span>
        </label>
        <label className="form-field" htmlFor="post-body">
          <span className="form-field__label">Text</span>
          <textarea id="post-body" className="form-control" rows={12} required maxLength={10000} value={fields.body} onChange={(event) => set("body", event.target.value)} />
          <span className="form-field__hint">Leave an empty line between paragraphs.</span>
        </label>
        <div className="post-editor__pair">
          <label className="form-field" htmlFor="post-date">
            <span className="form-field__label">
              Event date<span className="form-field__optional">Optional</span>
            </span>
            <input id="post-date" className="form-control" type="date" value={fields.event_date ?? ""} onChange={(event) => set("event_date", event.target.value || null)} />
          </label>
          <label className="form-field" htmlFor="post-slug">
            <span className="form-field__label">
              Web address ending<span className="form-field__optional">Optional</span>
            </span>
            <input id="post-slug" className="form-control" type="text" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={slugFixed} value={fields.slug ?? ""} onChange={(event) => set("slug", event.target.value)} />
            <span className="form-field__hint">{slugFixed ? "Fixed once a post has been published, so shared links keep working." : "Lowercase words joined by hyphens. Left empty, it is made from the title."}</span>
          </label>
        </div>
        <MediaPicker label="Cover photo" options={images} value={fields.cover_media_id ?? ""} onChange={(id) => set("cover_media_id", id || null)} optional />
        <MediaPicker label="Video" options={videos} value={fields.video_media_id ?? ""} onChange={(id) => set("video_media_id", id || null)} optional />
      </div>
    </form>
  );
}
