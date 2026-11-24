"use client";

import { useId, useRef } from "react";
import { MediaThumb } from "@/components/admin/MediaThumb";
import type { Media } from "@/lib/admin-types";

type MediaPickerProps = {
  label: string;
  options: readonly Media[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
};

export function MediaPicker({ label, options, value, onChange, optional = false }: MediaPickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const chosen = options.find((media) => media.id === value);
  const choose = (id: string) => {
    onChange(id);
    dialog.current?.close();
  };

  return (
    <div className="media-picker">
      <span className="form-field__label">{label}</span>
      <div className="media-picker__current">
        {chosen ? <MediaThumb media={chosen} className="media-picker__thumb" /> : <span className="media-picker__empty">None chosen</span>}
        <div className="media-picker__actions">
          <button type="button" className="button button--secondary" onClick={() => dialog.current?.showModal()}>
            {chosen ? "Change" : "Choose from library"}
          </button>
          {chosen && optional ? (
            <button type="button" className="text-button" onClick={() => onChange("")}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {chosen ? <p className="form-field__hint">{chosen.kind === "image" ? chosen.alt : chosen.title}</p> : null}

      <dialog ref={dialog} className="media-dialog" aria-labelledby={titleId}>
        <div className="media-dialog__head">
          <h2 id={titleId}>{label}</h2>
          <button type="button" className="text-button" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
        {options.length === 0 ? (
          <p className="media-dialog__empty">The library has nothing to choose from yet. Add it on the Media page first.</p>
        ) : (
          <ul className="media-dialog__grid">
            {options.map((media) => (
              <li key={media.id}>
                <button type="button" className="media-dialog__option" aria-pressed={media.id === value} onClick={() => choose(media.id)}>
                  <MediaThumb media={media} className="media-dialog__thumb" />
                  <span>{media.kind === "image" ? media.alt : media.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </dialog>
    </div>
  );
}
