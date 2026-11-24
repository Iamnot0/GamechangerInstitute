"use client";

import { useState, useTransition } from "react";
import { ActionNotice, type Notice } from "@/components/admin/ActionNotice";
import { addVideo } from "@/lib/content-actions";
import { showLibrary } from "@/lib/media-library";

export function VideoLinkForm() {
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await addVideo({ youtube_url: link.trim(), title: title.trim() });
      if (!result.ok) {
        setNotice({ tone: "error", message: result.message, fieldErrors: result.fieldErrors });
        return;
      }
      setLink("");
      setTitle("");
      setNotice({ tone: "ok", message: "Video link added. It is first in the Library below." });
      showLibrary();
    });

  return (
    <section className="video-form" aria-labelledby="video-form-title">
      <h2 id="video-form-title" className="admin-section__title">
        Add a video link
      </h2>
      <p className="admin-page__lede">Paste a YouTube link. The video stays on YouTube and plays inside the site.</p>
      <form
        className="video-form__fields"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="form-field" htmlFor="video-link">
          <span className="form-field__label">YouTube link</span>
          <input id="video-link" className="form-control" type="url" inputMode="url" required maxLength={200} value={link} onChange={(event) => setLink(event.target.value)} />
        </label>
        <label className="form-field" htmlFor="video-title">
          <span className="form-field__label">Title shown on the site</span>
          <input id="video-title" className="form-control" type="text" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <button type="submit" className="button button--primary" disabled={busy}>
          {busy ? "Adding" : "Add video"}
        </button>
      </form>
      <ActionNotice notice={notice} />
    </section>
  );
}
