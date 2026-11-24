"use client";

import { useState, useTransition, type FormEvent } from "react";
import { completeSignIn, sendSignInCode } from "@/lib/auth-actions";

export function SignInForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResent(false);
    startTransition(async () => {
      const result = await sendSignInCode(email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCode("");
      setStep("code");
    });
  };

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResent(false);
    startTransition(async () => {
      const result = await completeSignIn(email, code);
      if (!result.ok) setError(result.message);
    });
  };

  const resend = () => {
    setError(null);
    setResent(false);
    startTransition(async () => {
      const result = await sendSignInCode(email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCode("");
      setResent(true);
    });
  };

  if (step === "email") {
    return (
      <form className="sign-in-form" onSubmit={submitEmail} aria-busy={pending}>
        <label className="form-field" htmlFor="staff-email">
          <span className="form-field__label">Work email</span>
          <input
            id="staff-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="name@gamechanger.institute"
            className="form-control"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {error ? (
          <p className="form-field__error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? "Sending code…" : "Send sign-in code"}
        </button>
      </form>
    );
  }

  return (
    <form className="sign-in-form" onSubmit={submitCode} aria-busy={pending}>
      <p className="sign-in-form__note">
        If <strong>{email.trim().toLowerCase()}</strong> has staff access, a 6-digit code has been sent. It expires in 10 minutes.
      </p>

      <label className="form-field" htmlFor="staff-code">
        <span className="form-field__label">6-digit code</span>
        <input
          id="staff-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          required
          maxLength={6}
          placeholder="000000"
          className="form-control sign-in-form__code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </label>

      {error ? (
        <p className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}

      {resent ? (
        <p className="status-form__saved" role="status">
          A fresh code has been sent.
        </p>
      ) : null}

      <button type="submit" className="button button--primary" disabled={pending || code.length !== 6}>
        {pending ? "Verifying…" : "Sign in"}
      </button>

      <div className="sign-in-form__links">
        <button type="button" className="text-button" disabled={pending} onClick={resend}>
          Send a new code
        </button>
        <button
          type="button"
          className="text-button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setResent(false);
            setCode("");
            setStep("email");
          }}
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
