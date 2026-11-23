import { DataTable } from "@/components/ui/DataTable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { engines, enginesNote } from "@/content/programme";

export function EnginesSection() {
  return (
    <section className="engines" aria-labelledby="engines-title">
      <div className="engines__inner">
        <SectionHeading
          id="engines-title"
          title={
            <>
              Three engines, <em>one agreed plan</em>
            </>
          }
          lede="What each part does, and what it does not do."
          align="split"
        />
        <DataTable
          caption="The three engines of the programme"
          columns={[
            { key: "name", header: "Engine" },
            { key: "contributes", header: "What it contributes" },
            { key: "doesNot", header: "What it does not do" },
          ]}
          rows={engines}
        />
        <p className="engines__note">{enginesNote}</p>
      </div>
    </section>
  );
}
