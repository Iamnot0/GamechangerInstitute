import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
};

export function FormField({ id, label, hint, error, optional = false, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="form-field" data-invalid={error ? true : undefined}>
      <label htmlFor={id} className="form-field__label">
        {label}
        {optional ? <span className="form-field__optional">Optional</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      ) : null}
      {children(describedBy)}
      {error ? (
        <p id={errorId} className="form-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
