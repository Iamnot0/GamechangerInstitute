import { SectionHeading } from "@/components/ui/SectionHeading";
import { measures, measuresNote, pilotTargets } from "@/content/programme";

export function MeasurementSection() {
  return (
    <section className="measurement" aria-labelledby="measurement-title">
      <div className="measurement__inner">
        <SectionHeading
          id="measurement-title"
          title="Four questions, answered separately"
          lede="A small set of complementary measures, each with a baseline."
          align="split"
        />

        <ol className="measurement__questions">
          {measures.map((measure) => (
            <li key={measure.name} className="measurement__question">
              <p className="measurement__number">{measure.number}</p>
              <h3 className="measurement__name">{measure.name}</h3>
              <p className="measurement__ask">{measure.question}</p>
              <p className="measurement__instruments">{measure.instruments}</p>
              <p className="measurement__limit">
                <span>Cannot show by itself:</span> {measure.cannotShow}
              </p>
            </li>
          ))}
        </ol>

        <p className="measurement__note">{measuresNote}</p>

        <section className="targets" aria-labelledby="targets-title">
          <h3 id="targets-title" className="targets__title">
            Pilot targets, set in advance
          </h3>
          <p className="targets__caption">{pilotTargets.caption}</p>
          <dl className="targets__values">
            {pilotTargets.targets.map((target) => (
              <div key={target.value} className="targets__value">
                <dt>{target.text}</dt>
                <dd>
                  <span className="targets__qualifier">At least</span> {target.value}
                </dd>
              </div>
            ))}
          </dl>
          <dl className="targets__reporting">
            {pilotTargets.reporting.map((item) => (
              <div key={item.name}>
                <dt>{item.name}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
          <p className="targets__selection">{pilotTargets.selectionNote}</p>
        </section>
      </div>
    </section>
  );
}
