"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/FormField";
import { KindChooser } from "@/components/forms/KindChooser";
import { SubmissionReceived } from "@/components/forms/SubmissionReceived";
import { submitEnquiry } from "@/lib/api";
import {
  limits,
  roleTransitions,
  validateEnquiry,
  type EnquiryField,
  type EnquiryKind,
  type EnquiryPayload,
  type FieldErrors,
  type RoleTransition,
} from "@/lib/enquiry";

type Values = {
  kind: EnquiryKind;
  full_name: string;
  email: string;
  organisation: string;
  role_title: string;
  role_transition: RoleTransition | "";
  cohort_size: string;
  message: string;
  consent: boolean;
  website: string;
};

type Phase =
  | { name: "editing" }
  | { name: "submitting" }
  | { name: "accepted"; reference: string; firstName: string; email: string };

const fieldOrder: readonly EnquiryField[] = [
  "full_name",
  "email",
  "organisation",
  "role_title",
  "role_transition",
  "cohort_size",
  "message",
  "consent",
];

const fieldId = (field: EnquiryField) => `enquiry-${field}`;
const orNull = (value: string) => value.trim() || null;

function toPayload(values: Values): EnquiryPayload {
  const isIndividual = values.kind === "individual";
  const isOrganisation = values.kind === "organisation";
  const cohortSize = values.cohort_size.trim();

  return {
    kind: values.kind,
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    organisation: orNull(values.organisation),
    role_title: orNull(values.role_title),
    role_transition: isIndividual && values.role_transition ? values.role_transition : null,
    cohort_size: isOrganisation && cohortSize ? Number(cohortSize) : null,
    message: orNull(values.message),
    consent: values.consent,
    website: values.website,
  };
}

function minutesFrom(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}

type RegisterFormProps = { initialKind: EnquiryKind };

export function RegisterForm({ initialKind }: RegisterFormProps) {
  const [values, setValues] = useState<Values>({
    kind: initialKind,
    full_name: "",
    email: "",
    organisation: "",
    role_title: "",
    role_transition: "",
    cohort_size: "",
    message: "",
    consent: false,
    website: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "editing" });
  const idempotencyKey = useRef<string | null>(null);

  const update = <Key extends keyof Values>(key: Key, value: Values[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusFirstError = (fieldErrors: FieldErrors) => {
    const first = fieldOrder.find((field) => fieldErrors[field]);
    if (first) document.getElementById(fieldId(first))?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase.name === "submitting") return;

    const payload = toPayload(values);
    const fieldErrors = validateEnquiry(payload);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setAlert("Some details need correcting before we can send this.");
      focusFirstError(fieldErrors);
      return;
    }

    setErrors({});
    setAlert(null);
    setPhase({ name: "submitting" });
    idempotencyKey.current ??= crypto.randomUUID();

    const result = await submitEnquiry(payload, idempotencyKey.current);

    switch (result.status) {
      case "accepted":
        setPhase({
          name: "accepted",
          reference: result.id.slice(0, 8).toUpperCase(),
          firstName: payload.full_name.split(/\s+/)[0],
          email: payload.email,
        });
        return;
      case "invalid":
        setPhase({ name: "editing" });
        setErrors(result.fieldErrors);
        setAlert(result.message);
        focusFirstError(result.fieldErrors);
        return;
      case "rate_limited":
        setPhase({ name: "editing" });
        setAlert(`We have received several submissions from your network. Please try again in ${minutesFrom(result.retryAfterSeconds)}.`);
        return;
      case "unavailable":
        setPhase({ name: "editing" });
        setAlert("We could not reach our server. Your details are still here, so please try again in a moment.");
        return;
    }
  };

  if (phase.name === "accepted") {
    return <SubmissionReceived firstName={phase.firstName} email={phase.email} reference={phase.reference} />;
  }

  const submitting = phase.name === "submitting";

  return (
    <form className="register-form" noValidate onSubmit={onSubmit} aria-busy={submitting}>
      {alert ? (
        <p className="register-form__alert" role="alert">
          {alert}
        </p>
      ) : null}

      <KindChooser value={values.kind} onChange={(kind) => update("kind", kind)} />

      <div className="register-form__grid">
        <FormField id={fieldId("full_name")} label="Full name" error={errors.full_name}>
          {(describedBy) => (
            <input
              id={fieldId("full_name")}
              name="full_name"
              type="text"
              autoComplete="name"
              required
              maxLength={limits.fullName.max}
              value={values.full_name}
              onChange={(event) => update("full_name", event.target.value)}
              aria-invalid={errors.full_name ? true : undefined}
              aria-describedby={describedBy}
              className="form-control"
            />
          )}
        </FormField>

        <FormField id={fieldId("email")} label="Work email" error={errors.email}>
          {(describedBy) => (
            <input
              id={fieldId("email")}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={limits.email}
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy}
              className="form-control"
            />
          )}
        </FormField>

        <FormField
          id={fieldId("organisation")}
          label="Organisation"
          optional={values.kind !== "organisation"}
          error={errors.organisation}
        >
          {(describedBy) => (
            <input
              id={fieldId("organisation")}
              name="organisation"
              type="text"
              autoComplete="organization"
              required={values.kind === "organisation"}
              maxLength={limits.organisation}
              value={values.organisation}
              onChange={(event) => update("organisation", event.target.value)}
              aria-invalid={errors.organisation ? true : undefined}
              aria-describedby={describedBy}
              className="form-control"
            />
          )}
        </FormField>

        <FormField id={fieldId("role_title")} label="Current role" optional error={errors.role_title}>
          {(describedBy) => (
            <input
              id={fieldId("role_title")}
              name="role_title"
              type="text"
              autoComplete="organization-title"
              maxLength={limits.roleTitle}
              value={values.role_title}
              onChange={(event) => update("role_title", event.target.value)}
              aria-invalid={errors.role_title ? true : undefined}
              aria-describedby={describedBy}
              className="form-control"
            />
          )}
        </FormField>

        {values.kind === "individual" ? (
          <FormField
            id={fieldId("role_transition")}
            label="The transition you are making"
            optional
            error={errors.role_transition}
          >
            {(describedBy) => (
              <select
                id={fieldId("role_transition")}
                name="role_transition"
                value={values.role_transition}
                onChange={(event) => update("role_transition", event.target.value as RoleTransition | "")}
                aria-invalid={errors.role_transition ? true : undefined}
                aria-describedby={describedBy}
                className="form-control form-control--select"
              >
                <option value="">Choose one</option>
                {roleTransitions.map((transition) => (
                  <option key={transition.value} value={transition.value}>
                    {transition.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        ) : null}

        {values.kind === "organisation" ? (
          <FormField
            id={fieldId("cohort_size")}
            label="Leaders you have in mind"
            hint="A corporate cohort takes 8 to 12 leaders."
            optional
            error={errors.cohort_size}
          >
            {(describedBy) => (
              <input
                id={fieldId("cohort_size")}
                name="cohort_size"
                type="number"
                inputMode="numeric"
                min={limits.cohortSize.min}
                max={limits.cohortSize.max}
                step={1}
                value={values.cohort_size}
                onChange={(event) => update("cohort_size", event.target.value)}
                aria-invalid={errors.cohort_size ? true : undefined}
                aria-describedby={describedBy}
                className="form-control form-control--short"
              />
            )}
          </FormField>
        ) : null}
      </div>

      <FormField
        id={fieldId("message")}
        label={values.kind === "general" ? "Your enquiry" : "What would you like us to know?"}
        hint={values.kind === "general" ? undefined : "For example, the role outcome you are working toward."}
        optional
        error={errors.message}
      >
        {(describedBy) => (
          <textarea
            id={fieldId("message")}
            name="message"
            rows={5}
            maxLength={limits.message}
            value={values.message}
            onChange={(event) => update("message", event.target.value)}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy}
            className="form-control form-control--textarea"
          />
        )}
      </FormField>

      <div className="register-form__trap" aria-hidden="true">
        <label htmlFor="enquiry-website">Leave this field empty</label>
        <input
          id="enquiry-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </div>

      <div className="consent" data-invalid={errors.consent ? true : undefined}>
        <input
          id={fieldId("consent")}
          name="consent"
          type="checkbox"
          checked={values.consent}
          onChange={(event) => update("consent", event.target.checked)}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? "enquiry-consent-error" : undefined}
          className="consent__input"
        />
        <label htmlFor={fieldId("consent")} className="consent__label">
          I agree that GameChanger Institute may use these details to respond to my enquiry, as described in the{" "}
          <Link href="/privacy/">privacy notice</Link>.
        </label>
        {errors.consent ? (
          <p id="enquiry-consent-error" className="form-field__error consent__error">
            {errors.consent}
          </p>
        ) : null}
      </div>

      <button type="submit" className="button button--primary register-form__submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send registration"}
      </button>
    </form>
  );
}
