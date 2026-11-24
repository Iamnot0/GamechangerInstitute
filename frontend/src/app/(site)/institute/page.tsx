import { ClosingCta } from "@/components/sections/ClosingCta";
import { FounderSection } from "@/components/sections/FounderSection";
import { PatronSection } from "@/components/sections/PatronSection";
import { PlatformsSection } from "@/components/sections/PlatformsSection";
import { StewardsSection } from "@/components/sections/StewardsSection";
import { PageIntro } from "@/components/ui/PageIntro";
import { heroPhotos } from "@/content/heroes";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/metadata";
import { breadcrumb } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "The Institute",
  description:
    "GameChanger Institute convenes serving board members and C-suite leaders as stewards: mentorship, the Global Leaders Roundtable, keynotes and partnerships.",
  path: "/institute/",
});

export default function InstitutePage() {
  return (
    <>
      <PageIntro
        context="GameChanger Institute"
        photo={heroPhotos.institute}
        title="An institute of leaders who have held the role."
        lede="GCI brings serving board members, CEOs, CFOs and CTOs together as stewards, and puts their experience to work for the leaders coming after them."
      />
      <FounderSection />
      <StewardsSection />
      <PlatformsSection />
      <PatronSection />
      <ClosingCta
        title={["Steward, partner or participant."]}
        body="Whether you want to join a cohort, bring one to your organisation, or contribute as a steward, start with a short note."
        primary={{ href: "/register/?track=general", label: "Get in touch" }}
      />
      <JsonLd data={breadcrumb("The Institute", "/institute/")} />
    </>
  );
}
