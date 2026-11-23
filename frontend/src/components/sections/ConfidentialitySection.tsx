const commitments = [
  {
    receives: "What the organisation receives",
    items: ["Themes across the cohort", "Adjustments agreed and made", "Goal outcomes by category", "Whether adjustments are still in place at follow-up"],
  },
  {
    receives: "What it never receives",
    items: ["An individual’s five-lens profile", "Wellbeing or psychological capital scores", "Coaching notes", "The participant’s story"],
  },
] as const;

export function ConfidentialitySection() {
  return (
    <section className="confidentiality" aria-labelledby="confidentiality-title">
      <div className="confidentiality__inner">
        <h2 id="confidentiality-title" className="confidentiality__title">
          Aggregate reporting, and a record the leader owns
        </h2>
        <div className="confidentiality__columns">
          {commitments.map((group) => (
            <div key={group.receives} className="confidentiality__column">
              <h3 className="confidentiality__heading">{group.receives}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="confidentiality__note">
          Each disclosure has a stated purpose, a named recipient and the participant’s consent, in line with Singapore’s
          Personal Data Protection Act.
        </p>
      </div>
    </section>
  );
}
