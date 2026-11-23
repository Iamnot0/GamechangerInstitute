import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { RegisterFormWithTrack } from "@/components/forms/RegisterFormWithTrack";

export const metadata: Metadata = {
  title: "Register interest",
  description:
    "Register interest in the GameChanger Leadership Transformation Programme pilot, for yourself or for a cohort from your organisation.",
  alternates: { canonical: "/register/" },
};

const nextSteps = [
  {
    title: "An entry conversation",
    body: "Your concerns, the role outcome you want, the support you need, and whether the programme is suitable.",
  },
  {
    title: "A clear account of the programme",
    body: "What it can deliver, who will see your record, and how reviews work, before you commit to anything.",
  },
  {
    title: "Enrolment for the pilot cohort",
    body: "Twelve leaders in circles of four, matched with steward mentors and a sponsor.",
  },
] as const;

export default function RegisterPage() {
  return (
    <section className="register" aria-labelledby="page-title">
      <div className="register__inner">
        <div className="register__intro">
          <h1 id="page-title" className="register__title">
            Register interest in the pilot
          </h1>
          <p className="register__lede">
            The first open cohort will run as a prospectively evaluated pilot. Registering commits you to nothing.
          </p>
          <h2 className="register__steps-title">What happens next</h2>
          <ol className="register__steps">
            {nextSteps.map((step) => (
              <li key={step.title}>
                <p className="register__step-title">{step.title}</p>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="register__form">
          <Suspense fallback={<RegisterForm initialKind="individual" />}>
            <RegisterFormWithTrack />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
