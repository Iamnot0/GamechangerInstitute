import { principle } from "@/content/programme";

export function GapFigure() {
  return (
    <figure className="gap-figure">
      <div className="gap-figure__row">
        <p className="gap-figure__term">
          {principle.capacity.term}
          <span className="gap-figure__gloss">what a leader can do in a standard setting</span>
        </p>
        <div className="gap-figure__track">
          <span className="gap-figure__bar gap-figure__bar--capacity" />
        </div>
      </div>

      <div className="gap-figure__row">
        <p className="gap-figure__term">
          {principle.performance.term}
          <span className="gap-figure__gloss">what the leader does in their own environment</span>
        </p>
        <div className="gap-figure__track">
          <span className="gap-figure__bar gap-figure__bar--performance" />
          <span className="gap-figure__bar gap-figure__bar--gap" />
        </div>
      </div>

      <div className="gap-figure__dimension">
        <span className="gap-figure__dimension-line" aria-hidden="true" />
        <p className="gap-figure__dimension-label">
          The gap
          <span className="gap-figure__gloss">points to the environment</span>
        </p>
      </div>

      <figcaption className="gap-figure__caption">
        Fig. 1. Capacity and performance, the distinction the programme takes from the WHO ICF.
      </figcaption>
    </figure>
  );
}
