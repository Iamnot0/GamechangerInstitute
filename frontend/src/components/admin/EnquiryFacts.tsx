import { kindLabels, type EnquiryDetail } from "@/lib/admin-types";
import { roleTransitions } from "@/lib/enquiry";
import { formatDateTime } from "@/lib/format";

const transitionLabel = (value: EnquiryDetail["role_transition"]) =>
  roleTransitions.find((transition) => transition.value === value)?.label;

export function EnquiryFacts({ enquiry }: { enquiry: EnquiryDetail }) {
  const facts = [
    { term: "Type", value: kindLabels[enquiry.kind] },
    { term: "Email", value: <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a> },
    { term: "Organisation", value: enquiry.organisation },
    { term: "Current role", value: enquiry.role_title },
    { term: "Transition", value: transitionLabel(enquiry.role_transition) },
    { term: "Leaders in mind", value: enquiry.cohort_size?.toString() },
    { term: "Received", value: formatDateTime(enquiry.created_at) },
    {
      term: "Team notified",
      value: enquiry.notified_at ? formatDateTime(enquiry.notified_at) : "Not yet: review this enquiry directly",
    },
    { term: "Consent", value: `Version ${enquiry.consent_version}, given ${formatDateTime(enquiry.consent_at)}` },
  ].filter((fact) => fact.value);

  return (
    <dl className="enquiry-facts">
      {facts.map((fact) => (
        <div key={fact.term} className="enquiry-facts__row">
          <dt>{fact.term}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
