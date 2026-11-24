import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/metadata";
import { breadcrumb } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Privacy notice",
  description:
    "How GameChanger Institute collects, uses and protects the personal data you share through this website.",
  path: "/privacy/",
});

export default function PrivacyPage() {
  return (
    <article className="legal" aria-labelledby="page-title">
      <div className="legal__inner">
        <h1 id="page-title" className="legal__title">
          Privacy notice
        </h1>
        <p className="legal__updated">Last updated 23 November 2026</p>

        <h2>What we collect</h2>
        <p>
          When you register interest, we collect the details you enter: your name, email address, organisation, current
          role, the transition you are making, the number of leaders you have in mind, your message, and the time you
          gave consent. We do not store your IP address or browser details with your registration.
        </p>

        <h2>Why we collect it</h2>
        <p>
          We use these details only to respond to your enquiry, arrange an entry conversation, and tell you when
          enrolment for the programme opens. We do not sell your data or use it for advertising.
        </p>

        <h2>Who sees it</h2>
        <p>
          Your registration is seen by the GameChanger Institute team responsible for the programme. If you join the
          programme, the participant record follows the programme’s own rules: you own your five-lens profile and
          decide what is shared, and an employer never receives your scores, coaching notes or story.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep enquiry records only as long as needed to respond and to run the programme you asked about.{" "}
          <mark className="legal__placeholder">[Retention period to be confirmed before launch]</mark>
        </p>

        <h2>Your rights</h2>
        <p>
          Under Singapore’s Personal Data Protection Act 2012 you may ask to access or correct your personal data, or
          withdraw your consent. Contact our data protection officer at{" "}
          <mark className="legal__placeholder">[Data protection officer email to be confirmed before launch]</mark>.
        </p>

        <p className="legal__back">
          <Link href="/register/" className="text-link">
            Back to registration
          </Link>
        </p>
      </div>
      <JsonLd data={breadcrumb("Privacy notice", "/privacy/")} />
    </article>
  );
}
