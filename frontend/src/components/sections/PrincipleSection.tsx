import { GapFigure } from "@/components/figures/GapFigure";
import { principle } from "@/content/programme";

export function PrincipleSection() {
  return (
    <section className="principle" aria-labelledby="principle-title">
      <div className="principle__inner">
        <h2 id="principle-title" className="principle__title">
          {principle.title}
        </h2>

        <div className="principle__figure">
          <GapFigure />
        </div>

        <dl className="principle__terms">
          {[principle.capacity, principle.performance].map((item) => (
            <div key={item.term} className="principle__term">
              <dt>{item.term}</dt>
              <dd>{item.definition}</dd>
            </div>
          ))}
        </dl>

        <p className="principle__gap">{principle.gap}</p>
        <p className="principle__source">{principle.source}</p>
      </div>
    </section>
  );
}
