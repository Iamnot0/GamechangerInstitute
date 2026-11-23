"use client";

import { useEffect, useRef } from "react";

type SubmissionReceivedProps = {
  firstName: string;
  email: string;
  reference: string;
};

export function SubmissionReceived({ firstName, email, reference }: SubmissionReceivedProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="submission-received" role="status">
      <h2 ref={headingRef} tabIndex={-1} className="submission-received__title">
        Thank you, {firstName}. Your registration is in.
      </h2>
      <p>
        We will reply to <strong>{email}</strong>. For the programme, the next step is an entry conversation about the
        role outcome you want, the support you need, and whether the programme is the right fit.
      </p>
      <p className="submission-received__reference">
        Reference <span>{reference}</span>
      </p>
    </div>
  );
}
