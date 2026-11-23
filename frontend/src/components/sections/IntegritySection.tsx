import { SectionHeading } from "@/components/ui/SectionHeading";
import { integrity } from "@/content/programme";

export function IntegritySection() {
  return (
    <section className="integrity" aria-labelledby="integrity-title">
      <div className="integrity__inner">
        <SectionHeading
          id="integrity-title"
          title={
            <>
              What this programme is, <em>and what it is not</em>
            </>
          }
          lede="Credibility depends on describing the model accurately."
        />

        <div className="integrity__columns">
          <div className="integrity__column integrity__column--is">
            <h3 className="integrity__heading">It is</h3>
            <ul>
              {integrity.is.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="integrity__column integrity__column--not">
            <h3 className="integrity__heading">It is not</h3>
            <ul>
              {integrity.isNot.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="integrity__closing">{integrity.closing}</p>
      </div>
    </section>
  );
}
