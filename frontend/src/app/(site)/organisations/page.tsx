import { ClosingCta } from "@/components/sections/ClosingCta";
import { ConfidentialitySection } from "@/components/sections/ConfidentialitySection";
import { CorporateAdditionsSection } from "@/components/sections/CorporateAdditionsSection";
import { CorporatePlanSection } from "@/components/sections/CorporatePlanSection";
import { RolloutSection } from "@/components/sections/RolloutSection";
import { SuccessStoriesSection } from "@/components/sections/SuccessStoriesSection";
import { TracksSection } from "@/components/sections/TracksSection";
import { PageIntro } from "@/components/ui/PageIntro";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/metadata";
import { breadcrumb } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "For organisations",
  description:
    "The corporate track: cohorts of 8 to 12 leaders, sponsor compacts with dated actions, an environment scan, and reporting that never exposes an individual.",
  path: "/organisations/",
});

export default function OrganisationsPage() {
  return (
    <>
      <PageIntro
        context="The corporate track"
        title="Leaders change faster when the environment changes with them."
        lede="Cohorts of 8 to 12 leaders from one organisation, with a named executive sponsor and line sponsors who commit to dated changes in the workplace."
      />
      <TracksSection />
      <CorporateAdditionsSection />
      <CorporatePlanSection />
      <SuccessStoriesSection />
      <ConfidentialitySection />
      <RolloutSection />
      <ClosingCta
        title={["Plan a cohort with us."]}
        body="Tell us about the leaders you have in mind and the transition they are making. We will come back with how a corporate cohort would run in your organisation."
        primary={{ href: "/register/?track=organisation", label: "Start a corporate enquiry" }}
      />
      <JsonLd data={breadcrumb("For organisations", "/organisations/")} />
    </>
  );
}
