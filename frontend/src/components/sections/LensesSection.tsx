import { LensStack } from "@/components/figures/LensStack";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { lenses, lensesNote } from "@/content/programme";

type LensesSectionProps = { detailed?: boolean };

export function LensesSection({ detailed = false }: LensesSectionProps) {
  return (
    <section className="lenses" aria-labelledby="lenses-title">
      <div className="lenses__inner">
        <div className="lenses__visual">
          <SectionHeading
            id="lenses-title"
            title={
              <>
                Five lenses <em>on one leader</em>
              </>
            }
            lede="Each ICF component asks a question. GCI translates it for leadership, so the person, the task and the setting are seen together."
          />
          <LensStack />
        </div>

        <ol className="lenses__list">
          {lenses.map((lens, index) => (
            <li key={lens.id} className="lenses__item">
              <p className="lenses__index">{index + 1}</p>
              <div className="lenses__body">
                <h3 className="lenses__name">{lens.name}</h3>
                <p className="lenses__translation">{lens.translation}</p>
                <p className="lenses__icf">
                  ICF: {lens.icf}. <span>{lens.question}</span>
                </p>
                {detailed ? (
                  <p className="lenses__recorded">
                    <strong>How it is recorded.</strong> {lens.recorded}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <p className="lenses__note">{lensesNote}</p>
      </div>
    </section>
  );
}
