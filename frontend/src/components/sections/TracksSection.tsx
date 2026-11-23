import { SectionHeading } from "@/components/ui/SectionHeading";
import { tracks } from "@/content/organisations";

const columns = [
  { key: "individual", title: "Individual track" },
  { key: "corporate", title: "Corporate track" },
] as const;

export function TracksSection() {
  return (
    <section className="tracks" aria-labelledby="tracks-title">
      <div className="tracks__inner">
        <SectionHeading
          id="tracks-title"
          title={
            <>
              Two tracks, <em>one method</em>
            </>
          }
          lede={tracks.intro}
          align="split"
        />

        <div className="tracks__grid">
          {columns.map((column) => (
            <article key={column.key} className={`tracks__track tracks__track--${column.key}`}>
              <h3 className="tracks__title">{column.title}</h3>
              <dl className="tracks__rows">
                {tracks.rows.map((row) => (
                  <div key={row.label} className="tracks__row">
                    <dt>{row.label}</dt>
                    <dd>{row[column.key]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <p className="tracks__note">{tracks.note}</p>
      </div>
    </section>
  );
}
