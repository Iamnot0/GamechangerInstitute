import { SectionHeading } from "@/components/ui/SectionHeading";
import { mentorshipEvidence, mentorshipFormats, mentorshipLoad } from "@/content/programme";

const fortnight = [
  { week: "A", label: "Week A", summary: "Masterclass and practice lab" },
  { week: "B", label: "Week B", summary: "Mentorship circle and one-to-one" },
] as const;

export function MentorshipSection() {
  return (
    <section className="mentorship" aria-labelledby="mentorship-title">
      <div className="mentorship__inner">
        <SectionHeading
          id="mentorship-title"
          title="Mentorship on a fortnightly rhythm"
          lede="Stewards teach, convene and review against each participant’s own goals."
          align="split"
        />

        <div className="mentorship__fortnight">
          {fortnight.map((half) => (
            <div key={half.week} className="mentorship__week">
              <h3 className="mentorship__week-title">
                {half.label}
                <span>{half.summary}</span>
              </h3>
              <ul className="mentorship__formats">
                {mentorshipFormats
                  .filter((format) => format.week === half.week)
                  .map((format) => (
                    <li key={format.name} className="mentorship__format">
                      <p className="mentorship__format-name">{format.name}</p>
                      <p className="mentorship__rhythm">{format.rhythm}</p>
                      <p className="mentorship__purpose">{format.purpose}</p>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mentorship__notes">
          <p>{mentorshipLoad}</p>
          <p>{mentorshipEvidence}</p>
        </div>
      </div>
    </section>
  );
}
