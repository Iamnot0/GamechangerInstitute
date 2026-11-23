import { SectionHeading } from "@/components/ui/SectionHeading";
import { questions } from "@/content/programme";

export function QuestionsSection() {
  return (
    <section className="questions" aria-labelledby="questions-title">
      <div className="questions__inner">
        <SectionHeading id="questions-title" title="Questions leaders ask" />
        <div className="questions__list">
          {questions.map((item) => (
            <details key={item.q} className="questions__item">
              <summary className="questions__q">{item.q}</summary>
              <p className="questions__a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
