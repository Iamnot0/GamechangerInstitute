import { glance } from "@/content/programme";

export function GlanceSection() {
  return (
    <section className="glance" aria-labelledby="glance-title">
      <div className="glance__inner">
        <h2 id="glance-title" className="glance__title">
          The programme at a glance
        </h2>
        <dl className="glance__facts">
          {glance.facts.map((fact) => (
            <div key={fact.label} className="glance__fact">
              <dt className="glance__label">{fact.label}</dt>
              <dd className="glance__value">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="glance__caption">
          {glance.caption} Two tracks, individual and corporate, run on one method: Scope, Frame, Ideate, Build, Sustain.
        </p>
      </div>
    </section>
  );
}
