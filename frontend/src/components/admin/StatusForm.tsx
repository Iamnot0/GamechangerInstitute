"use client";

import { useActionState } from "react";
import { changeEnquiryStatus, type StatusFormState } from "@/lib/admin-actions";
import { enquiryStatuses, statusLabels, type EnquiryStatus } from "@/lib/admin-types";

type StatusFormProps = { enquiryId: string; current: EnquiryStatus };

const initialState: StatusFormState = { outcome: "idle" };

export function StatusForm({ enquiryId, current }: StatusFormProps) {
  const [state, action, pending] = useActionState(changeEnquiryStatus, initialState);
  const choices = enquiryStatuses.filter((status) => status !== current);

  return (
    <form action={action} className="status-form" aria-busy={pending}>
      <input type="hidden" name="id" value={enquiryId} />
      <input type="hidden" name="expected_status" value={current} />

      <fieldset className="status-form__choices">
        <legend className="form-field__label">Move to</legend>
        {choices.map((status, index) => (
          <label key={status} className="status-form__choice">
            <input type="radio" name="status" value={status} defaultChecked={index === 0} />
            {statusLabels[status]}
          </label>
        ))}
      </fieldset>

      <div className="form-field">
        <label htmlFor="status-note" className="form-field__label">
          Note
          <span className="form-field__optional">Optional</span>
        </label>
        <textarea id="status-note" name="note" rows={3} maxLength={1000} className="form-control form-control--textarea" />
      </div>

      {state.outcome === "error" ? (
        <p className="form-field__error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.outcome === "saved" ? (
        <p className="status-form__saved" role="status">
          Status changed to {statusLabels[state.status]}.
        </p>
      ) : null}

      <button type="submit" className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Update status"}
      </button>
    </form>
  );
}
