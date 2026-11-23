import { JourneyTimeline } from "@/components/figures/JourneyTimeline";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { journeyNote } from "@/content/programme";

export function JourneySection() {
  return (
    <section className="journey" aria-labelledby="journey-title">
      <div className="journey__inner">
        <SectionHeading
          id="journey-title"
          title={
            <>
              Twelve weeks, <em>then six months of follow-up</em>
            </>
          }
          lede="Entry and shared assessment, goal setting, practice, environmental action, then review and follow-up."
        />
        <JourneyTimeline />
        <p className="journey__note">{journeyNote}</p>
      </div>
    </section>
  );
}
