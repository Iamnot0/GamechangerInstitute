import { SectionHeading } from "@/components/ui/SectionHeading";
import { perma, positivePsychologyEvidence, practiceLab, psychologicalCapital } from "@/content/programme";

export function PositivePsychologySection() {
  return (
    <section className="psychology" aria-labelledby="psychology-title">
      <div className="psychology__inner">
        <SectionHeading
          id="psychology-title"
          title="Positive psychology: build on what is strong"
          lede="Two frameworks and one fortnightly practice lab, led by a credentialed coach who is available to participants between sessions."
        />

        <div className="psychology__frameworks">
          <article className="psychology__framework">
            <h3 className="psychology__framework-title">Wellbeing, PERMA</h3>
            <p className="psychology__source">Seligman, 2011</p>
            <ul className="psychology__perma">
              {perma.map((item) => (
                <li key={item.letter}>
                  <span className="psychology__letter" aria-hidden="true">
                    {item.letter}
                  </span>
                  {item.name}
                </li>
              ))}
            </ul>
            <p className="psychology__use">Wellbeing profile at baseline and completion; themes for the practice labs.</p>
          </article>

          <article className="psychology__framework">
            <h3 className="psychology__framework-title">Psychological capital</h3>
            <p className="psychology__source">Luthans, Youssef and Avolio, 2007</p>
            <dl className="psychology__capital">
              {psychologicalCapital.map((item) => (
                <div key={item.name}>
                  <dt>{item.name}</dt>
                  <dd>{item.gloss}</dd>
                </div>
              ))}
            </dl>
            <p className="psychology__use">Goal pathways in Frame; graded practice in Build, so that confidence follows evidence.</p>
          </article>
        </div>

        <div className="psychology__lab">
          <h3 className="psychology__lab-title">In the fortnightly practice lab</h3>
          <dl className="psychology__practices">
            {practiceLab.map((practice) => (
              <div key={practice.name} className="psychology__practice">
                <dt>{practice.name}</dt>
                <dd>{practice.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="psychology__evidence">{positivePsychologyEvidence}</p>
      </div>
    </section>
  );
}
