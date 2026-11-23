import { GapFigure } from "@/components/figures/GapFigure";
import { HeroBackdrop } from "@/components/figures/HeroBackdrop";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { registerLink } from "@/content/site";

export function HomeHero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <HeroBackdrop />
      <div className="hero__inner">
        <div className="hero__copy">
          <p className="hero__context">The GameChanger Leadership Transformation Programme</p>
          <h1 id="hero-title" className="hero__title">
            <span className="hero__word">From</span> <span className="hero__word">capacity</span>{" "}
            <span className="hero__word">to</span> <em className="hero__word">performance.</em>
          </h1>
          <p className="hero__lede">
            An ICF-informed pathway to positive transformation for individuals and organisations, through mentorship
            by serving leaders and positive psychology support.
          </p>
          <div className="hero__actions">
            <ButtonLink href={registerLink.href} variant="inverse">
              Register interest in the pilot
            </ButtonLink>
            <ButtonLink href="/programme/" variant="outline-inverse">
              Read the programme
            </ButtonLink>
          </div>
        </div>
        <div className="hero__figure">
          <GapFigure />
        </div>
      </div>
    </section>
  );
}
