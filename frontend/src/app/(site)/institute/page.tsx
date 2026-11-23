import type { Metadata } from "next";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { FounderSection } from "@/components/sections/FounderSection";
import { PatronSection } from "@/components/sections/PatronSection";
import { PlatformsSection } from "@/components/sections/PlatformsSection";
import { StewardsSection } from "@/components/sections/StewardsSection";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "The Institute",
  description:
    "GameChanger Institute convenes serving board members and C-suite leaders as stewards, through mentorship, the Global Leaders Roundtable, keynote platforms and key partnerships.",
  alternates: { canonical: "/institute/" },
};

export default function InstitutePage() {
  return (
    <>
      <PageIntro
        context="GameChanger Institute"
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
    </>
  );
}
