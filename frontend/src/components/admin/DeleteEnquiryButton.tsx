"use client";

import { useState, useTransition } from "react";
import { removeEnquiry } from "@/lib/admin-actions";

export function DeleteEnquiryButton({ enquiryId }: { enquiryId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeEnquiry(enquiryId);
      if (result && !result.ok) setError(result.message);
    });

  return (
    <div className="post-editor__actions">
      {!confirming ? (
        <button type="button" className="text-button text-button--danger" disabled={pending} onClick={() => setConfirming(true)}>
          Delete enquiry
        </button>
      ) : (
        <>
          <button type="button" className="text-button text-button--danger" disabled={pending} onClick={handleDelete}>
            {pending ? "Deleting…" : "Yes, delete it"}
          </button>
          <button type="button" className="text-button" disabled={pending} onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </>
      )}
      {error ? (
        <p className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
