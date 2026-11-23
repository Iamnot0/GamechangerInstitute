import { ClosingCta } from "@/components/sections/ClosingCta";
import { EnginesSection } from "@/components/sections/EnginesSection";
import { GlanceSection } from "@/components/sections/GlanceSection";
import { HomeHero } from "@/components/sections/HomeHero";
import { InstituteTeaserSection } from "@/components/sections/InstituteTeaserSection";
import { IntegritySection } from "@/components/sections/IntegritySection";
import { JourneySection } from "@/components/sections/JourneySection";
import { LensesSection } from "@/components/sections/LensesSection";
import { PrincipleSection } from "@/components/sections/PrincipleSection";
import { SuccessStoriesSection } from "@/components/sections/SuccessStoriesSection";
import { TracksSection } from "@/components/sections/TracksSection";
import { registerLink, site } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <GlanceSection />
      <PrincipleSection />
      <LensesSection />
      <EnginesSection />
      <JourneySection />
      <TracksSection />
      <SuccessStoriesSection />
      <InstituteTeaserSection />
      <IntegritySection />
      <ClosingCta
        title={site.tagline}
        body="The first open cohort will run as a prospectively evaluated pilot of twelve leaders. Register interest and we will contact you before enrolment opens."
        primary={registerLink}
        secondary={{ href: "/organisations/", label: "Enquire for your organisation" }}
      />
    </>
  );
}
