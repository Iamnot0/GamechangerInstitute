import { HeroBackdrop } from "@/components/figures/HeroBackdrop";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { registerLink } from "@/content/site";

export function HomeHero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <HeroBackdrop />
      <div className="hero__inner">
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">
            <em className="hero__word">ARISE</em>{" "}
            <span className="hero__word">Leadership</span>{" "}
            <span className="hero__word">Transformation</span>{" "}
            <span className="hero__word">Program</span>{" "}
            <span className="hero__word">Series</span>
          </h1>
          <p className="hero__tagline">From capacity to performance.</p>
          <p className="hero__lede">
            An ICF-informed pathway to positive transformation for individuals
            and organisations, through mentorship by serving leaders and
            positive psychology support.
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
      </div>
    </section>
  );
}
