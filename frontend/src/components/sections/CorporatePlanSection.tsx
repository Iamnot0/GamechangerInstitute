import { DataTable } from "@/components/ui/DataTable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { corporatePlan } from "@/content/organisations";

export function CorporatePlanSection() {
  return (
    <section className="corporate-plan" aria-labelledby="corporate-plan-title">
      <div className="corporate-plan__inner">
        <SectionHeading
          id="corporate-plan-title"
          title="What a corporate engagement looks like"
          lede="An illustrative plan. Every element has an owner and a piece of evidence that shows it happened."
          align="split"
        />

        <article className="corporate-plan__brief">
          <p className="plan__label">Illustrative</p>
          <h3 className="corporate-plan__title">{corporatePlan.title}</h3>
          <p>{corporatePlan.brief}</p>
        </article>

        <DataTable
          caption="Illustrative corporate plan"
          columns={[
            { key: "element", header: "Element" },
            { key: "action", header: "Action" },
            { key: "owner", header: "Owner" },
            { key: "evidence", header: "Evidence" },
          ]}
          rows={corporatePlan.rows}
        />
      </div>
    </section>
  );
}
