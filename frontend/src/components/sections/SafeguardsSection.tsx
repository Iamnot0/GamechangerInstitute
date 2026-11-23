import { SectionHeading } from "@/components/ui/SectionHeading";
import { safeguards } from "@/content/programme";

export function SafeguardsSection() {
  return (
    <section className="safeguards" aria-labelledby="safeguards-title">
      <div className="safeguards__inner">
        <SectionHeading
          id="safeguards-title"
          title="Scope, safeguards and trust"
          lede="Leadership development with clear limits, and a record the participant controls."
          align="split"
        />
        <div className="safeguards__list">
          {safeguards.map((item) => (
            <article key={item.title} className="safeguards__item">
              <h3 className="safeguards__title">{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
