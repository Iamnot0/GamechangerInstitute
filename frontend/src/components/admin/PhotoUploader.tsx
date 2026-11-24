"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { ActionNotice, type Notice } from "@/components/admin/ActionNotice";
import { addImage } from "@/lib/content-actions";
import { showLibrary } from "@/lib/media-library";

type Pending = { id: string; file: File; preview: string; alt: string };

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const longestEdge = 1920;

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

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

  // Browsers that cannot write WebP answer with PNG, which is kept: it preserves a logo's transparency.
  const blob = await encode(canvas, "image/webp", 0.84);
  if (!blob) throw new Error(`${file.name} could not be read as a photo.`);
  return { blob, width: canvas.width, height: canvas.height };
}

const storageName = (file: File, type: string) =>
  `photos/${file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "photo"}.${type.split("/")[1]}`;

export function PhotoUploader() {
  const [queue, setQueue] = useState<Pending[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const add = (files: FileList | null) => {
    const photos = [...(files ?? [])].filter((file) => acceptedTypes.includes(file.type));
    if (files?.length && photos.length < files.length) {
      setNotice({ tone: "error", message: "Only JPG, PNG and WebP photos can be added." });
    } else {
      setNotice(null);
    }
    setQueue((current) => [
      ...current,
      ...photos.map((file) => {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        return { id: crypto.randomUUID(), file, preview, alt: "" };
      }),
    ]);
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    add(event.dataTransfer.files);
  };

  const describe = (id: string, alt: string) => setQueue((current) => current.map((item) => (item.id === id ? { ...item, alt } : item)));
  const remove = (id: string) => setQueue((current) => current.filter((item) => item.id !== id));
  const ready = queue.length > 0 && queue.every((item) => item.alt.trim().length > 0);

  const send = () =>
    startTransition(async () => {
      let added = 0;
      for (const item of queue) {
        try {
          const { blob, width, height } = await prepare(item.file);
          const stored = await upload(storageName(item.file, blob.type), blob, {
            access: "public",
            handleUploadUrl: "/admin/media/upload/",
            contentType: blob.type,
          });
          const result = await addImage({ url: stored.url, content_type: blob.type, size_bytes: blob.size, width, height, alt: item.alt.trim() });
          if (!result.ok) throw new Error(result.message);
          added += 1;
          remove(item.id);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "The upload failed.";
          setNotice({ tone: "error", message: `${item.file.name} was not added. ${reason}` });
          return;
        }
      }
      setNotice({
        tone: "ok",
        message: `${added} ${added === 1 ? "photo" : "photos"} added. ${added === 1 ? "It is" : "They are"} first in the Library below.`,
      });
      showLibrary();
    });

  return (
    <section className="uploader" aria-labelledby="uploader-title">
      <h2 id="uploader-title" className="admin-section__title">
        Upload photos
      </h2>
      <label className="uploader__drop" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
        <input
          ref={input}
          type="file"
          className="uploader__input"
          accept={acceptedTypes.join(",")}
          multiple
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
        <strong>Drag photos here, or choose files</strong>
        <span>JPG, PNG or WebP. Large photos are resized automatically before they upload.</span>
      </label>

      {queue.length > 0 ? (
        <ul className="uploader__queue">
          {queue.map((item) => (
            <li key={item.id} className="uploader__item">
              <Image src={item.preview} width={160} height={120} alt="" className="uploader__preview" unoptimized />
              <label className="form-field" htmlFor={`alt-${item.id}`}>
                <span className="form-field__label">Describe {item.file.name}</span>
                <textarea
                  id={`alt-${item.id}`}
                  className="form-control"
                  rows={2}
                  maxLength={300}
                  value={item.alt}
                  onChange={(event) => describe(item.id, event.target.value)}
                />
                <span className="form-field__hint">What is happening in the picture. Screen readers and Google read this.</span>
              </label>
              <button type="button" className="text-button" disabled={busy} onClick={() => remove(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <ActionNotice notice={notice} />
      {queue.length > 0 ? (
        <button type="button" className="button button--primary" disabled={!ready || busy} onClick={send}>
          {busy ? "Uploading" : `Add ${queue.length} to the library`}
        </button>
      ) : null}
    </section>
  );
}
