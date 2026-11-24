"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ActionNotice, type Notice } from "@/components/admin/ActionNotice";
import { MediaThumb } from "@/components/admin/MediaThumb";
import type { Media } from "@/lib/admin-types";
import { describeMedia, removeMedia } from "@/lib/content-actions";

export function MediaCard({ media }: { media: Media }) {
  const isImage = media.kind === "image";
  const saved = isImage ? media.alt : media.title;
  const [value, setValue] = useState(saved);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, startTransition] = useTransition();
  const inUse = media.used_in.length > 0;

  const save = () =>
    startTransition(async () => {
      const result = await describeMedia(media.id, isImage ? { alt: value.trim() } : { title: value.trim() });
      setNotice(result.ok ? { tone: "ok", message: "Saved." } : { tone: "error", message: result.message, fieldErrors: result.fieldErrors });
    });

  const remove = () =>
    startTransition(async () => {
      const result = await removeMedia(media.id);
      if (!result.ok) setNotice({ tone: "error", message: result.message });
      setConfirming(false);
    });

  return (
    <li className="media-card">
      <div className="media-card__frame">
        <MediaThumb media={media} className="media-card__thumb" />
        {isImage ? null : <span className="media-card__kind">YouTube</span>}
      </div>
      <div className="media-card__body">
        <label className="form-field" htmlFor={`media-${media.id}`}>
          <span className="form-field__label">{isImage ? "Description" : "Title"}</span>
          <textarea id={`media-${media.id}`} className="form-control" rows={isImage ? 3 : 2} maxLength={isImage ? 300 : 120} value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        {inUse ? (
          <p className="media-card__use">On the site in: {media.used_in.join(", ")}</p>
        ) : (
          <p className="media-card__use">
            Not on the site yet.{" "}
            {isImage ? (
              <>
                Add it under <Link href="/admin/content/">Content</Link> or as the cover of a{" "}
              </>
            ) : (
              "Add it to a "
            )}
            <Link href="/admin/posts/">News post</Link>.
          </p>
        )}
        <div className="media-card__actions">
          <button type="button" className="text-button" disabled={busy || value.trim() === saved || value.trim() === ""} onClick={save}>
            Save
          </button>
          {confirming ? (
            <>
              <button type="button" className="text-button text-button--danger" disabled={busy} onClick={remove}>
                Confirm delete
              </button>
              <button type="button" className="text-button" disabled={busy} onClick={() => setConfirming(false)}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" className="text-button text-button--danger" disabled={busy || inUse} title={inUse ? "Take it off the site first" : undefined} onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
        <ActionNotice notice={notice} />
      </div>
    </li>
  );
}
