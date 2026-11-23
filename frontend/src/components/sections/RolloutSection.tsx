import { SectionHeading } from "@/components/ui/SectionHeading";
import { rollout } from "@/content/organisations";

export function RolloutSection() {
  return (
    <section className="rollout" aria-labelledby="rollout-title">
      <div className="rollout__inner">
        <SectionHeading id="rollout-title" title="Evidence before expansion" lede={rollout.caption} />

        <ol className="rollout__phases">
          {rollout.phases.map((phase) => (
            <li key={phase.period} className="rollout__phase">
              <p className="rollout__period">{phase.period}</p>
              <h3 className="rollout__name">{phase.name}</h3>
              <p className="rollout__work">{phase.work}</p>
              <p className="rollout__gate">
                <span>Evidence before moving on</span>
                {phase.gate}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
