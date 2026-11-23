import { DataTable } from "@/components/ui/DataTable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { illustrativePlan } from "@/content/programme";

export function IllustrativePlanSection() {
  return (
    <section className="plan" aria-labelledby="plan-title">
      <div className="plan__inner">
        <SectionHeading
          id="plan-title"
          title="One participant, one plan"
          lede="A fictional example to make the model concrete. It is not a case study and it does not describe a real person."
        />

        <article className="plan__case">
          <p className="plan__label">Illustrative and fictional</p>
          <h3 className="plan__title">{illustrativePlan.title}</h3>
          <p className="plan__context">{illustrativePlan.context}</p>
          <blockquote className="plan__goal">
            <p className="plan__goal-label">Participation goal</p>
            <p className="plan__goal-text">{illustrativePlan.goal}</p>
            <p className="plan__goal-note">{illustrativePlan.goalNote}</p>
          </blockquote>
        </article>

        <DataTable
          caption="The illustrative plan, lens by lens"
          columns={[
            { key: "lens", header: "Lens" },
            { key: "action", header: "Action" },
            { key: "evidence", header: "Evidence reviewed" },
          ]}
          rows={illustrativePlan.rows}
        />
      </div>
    </section>
  );
}
