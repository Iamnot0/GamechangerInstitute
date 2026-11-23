import { stages, sustainStage } from "@/content/programme";

export function JourneyTimeline() {
  return (
    <div className="journey-timeline">
      <div className="journey-timeline__scale" aria-hidden="true">
        {stages.map((stage) => (
          <span key={stage.name} className={`journey-timeline__bar journey-timeline__bar--${stage.name.toLowerCase()}`}>
            <span className="journey-timeline__bar-name">{stage.name}</span>
          </span>
        ))}
        <span className="journey-timeline__bar journey-timeline__bar--sustain">
          <span className="journey-timeline__bar-name">{sustainStage.name}</span>
        </span>
        <span className="journey-timeline__tick journey-timeline__tick--start">Week 1</span>
        <span className="journey-timeline__tick journey-timeline__tick--end">Week 12</span>
        <span className="journey-timeline__tick journey-timeline__tick--follow">Months 3 and 6</span>
      </div>

      <ol className="journey-timeline__stages">
        {[...stages, sustainStage].map((stage) => (
          <li key={stage.name} className="journey-timeline__stage">
            <p className="journey-timeline__number">{stage.number}</p>
            <h3 className="journey-timeline__name">{stage.name}</h3>
            <p className="journey-timeline__when">{stage.when}</p>
            <p className="journey-timeline__summary">{stage.summary}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
