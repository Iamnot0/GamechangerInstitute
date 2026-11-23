const points = [
  {
    term: "Shape",
    text: "Twelve weeks of structured programme, with follow-up at three and six months after completion. Cohorts of twelve leaders, in mentorship circles of four.",
  },
  {
    term: "Evidence",
    text: "Four questions are measured separately. Results are reported with denominators, and only after follow-up.",
  },
  {
    term: "Limits",
    text: "Leadership development, not treatment, with a referral route to registered clinicians. The ICF supplies structure. Whether the mentoring and coaching work is a separate question, which the pilot is designed to answer.",
  },
] as const;

export function ProgrammeSummarySection() {
  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="summary__inner">
        <div className="summary__argument">
          <h2 id="summary-title" className="summary__title">
            Most leadership development improves what a leader can do in a workshop.
          </h2>
          <p>
            Organisations and individuals pay for what the leader then does at work, and the two are often different.
            The WHO International Classification of Functioning, Disability and Health separates capacity, what a person
            can do in a standard setting, from performance, what they do in their own environment. It treats the gap
            between them as information about the environment: a barrier to remove or a support to keep.
          </p>
          <p>
            The programme applies the same structure to leadership. Each participant chooses two or three role outcomes
            that matter to them, and the programme works on the person, the tasks and the setting together.
          </p>
        </div>

        <dl className="summary__points">
          {points.map((point) => (
            <div key={point.term} className="summary__point">
              <dt>{point.term}</dt>
              <dd>{point.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
