import { SectionHeading } from "@/components/ui/SectionHeading";
import { team } from "@/content/programme";

export function TeamSection() {
  return (
    <section className="team" aria-labelledby="team-title">
      <div className="team__inner">
        <SectionHeading
          id="team-title"
          title="The team around each participant"
          lede="Six roles, each with one clear responsibility. These are functions, not six full-time posts."
        />
        <dl className="team__roles">
          {team.map((member) => (
            <div key={member.role} className="team__role">
              <dt>{member.role}</dt>
              <dd>{member.responsibility}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
