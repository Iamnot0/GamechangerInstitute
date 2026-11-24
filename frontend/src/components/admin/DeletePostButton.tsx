"use client";

import { useState, useTransition } from "react";
import { removePost } from "@/lib/news-actions";

type DeletePostButtonProps = { postId: string; title: string };

export function DeletePostButton({ postId, title }: DeletePostButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      setError(null);
      const result = await removePost(postId);
      if (!result.ok) setError(result.message);
    });

  if (!confirming) {
    return (
      <button type="button" className="text-button text-button--danger" onClick={() => setConfirming(true)}>
        Delete<span className="visually-hidden"> {title}</span>
      </button>
    );
  }

  return (
    <span className="post-list__confirm">
      <button type="button" className="text-button text-button--danger" disabled={pending} onClick={remove}>
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" className="text-button" disabled={pending} onClick={() => setConfirming(false)}>
        Keep
      </button>
      {error ? (
        <span className="form-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
