import { SectionHeading } from "@/components/ui/SectionHeading";
import { accountabilityQuote, corporateAdditions } from "@/content/organisations";

export function CorporateAdditionsSection() {
  return (
    <section className="additions" aria-labelledby="additions-title">
      <div className="additions__inner">
        <SectionHeading
          id="additions-title"
          title="For organisations, the environment is part of the work"
          lede="Four additions that turn recommendations into assigned actions."
        />

        <ol className="additions__list">
          {corporateAdditions.map((addition, index) => (
            <li key={addition.name} className="additions__item">
              <p className="additions__index">{index + 1}</p>
              <h3 className="additions__name">{addition.name}</h3>
              <p className="additions__body">{addition.body}</p>
            </li>
          ))}
        </ol>

        <figure className="additions__quote">
          <blockquote>
            <p>{accountabilityQuote.text}</p>
          </blockquote>
          <figcaption>{accountabilityQuote.source}</figcaption>
          <p className="additions__consequence">{accountabilityQuote.consequence}</p>
        </figure>
      </div>
    </section>
  );
}
