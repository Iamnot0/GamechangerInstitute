import { DataTable } from "@/components/ui/DataTable";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { reviewQuestions, weeks } from "@/content/programme";

export function WeekByWeekSection() {
  return (
    <section className="weeks" aria-labelledby="weeks-title">
      <div className="weeks__inner">
        <SectionHeading id="weeks-title" title="Week by week" lede="Every participant milestone, and the sessions that carry it." />

        <DataTable
          caption="The twelve-week programme, week by week"
          columns={[
            { key: "week", header: "Week" },
            { key: "stage", header: "Stage" },
            { key: "milestone", header: "Participant milestone" },
            { key: "sessions", header: "Sessions" },
          ]}
          rows={weeks}
        />

        <aside className="weeks__review" aria-labelledby="weeks-review-title">
          <h3 id="weeks-review-title" className="weeks__review-title">
            At each review the mentor asks three questions, separately
          </h3>
          <ol className="weeks__questions">
            {reviewQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
          <p className="weeks__review-note">
            If wellbeing improves without participation gains, the remaining task and environmental barriers are examined.
            If participation improves while strain persists, that benefit is recorded and support continues.
          </p>
        </aside>
      </div>
    </section>
  );
}
