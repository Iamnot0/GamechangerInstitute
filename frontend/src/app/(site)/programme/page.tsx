import { ClosingCta } from "@/components/sections/ClosingCta";
import { EnginesSection } from "@/components/sections/EnginesSection";
import { IllustrativePlanSection } from "@/components/sections/IllustrativePlanSection";
import { JourneySection } from "@/components/sections/JourneySection";
import { LensesSection } from "@/components/sections/LensesSection";
import { MeasurementSection } from "@/components/sections/MeasurementSection";
import { MentorshipSection } from "@/components/sections/MentorshipSection";
import { PositivePsychologySection } from "@/components/sections/PositivePsychologySection";
import { ProgrammeSummarySection } from "@/components/sections/ProgrammeSummarySection";
import { QuestionsSection } from "@/components/sections/QuestionsSection";
import { SafeguardsSection } from "@/components/sections/SafeguardsSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { WeekByWeekSection } from "@/components/sections/WeekByWeekSection";
import { PageIntro } from "@/components/ui/PageIntro";
import { heroPhotos } from "@/content/heroes";
import { registerLink } from "@/content/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/metadata";
import { breadcrumb, programmeCourse } from "@/lib/structured-data";

const description =
  "Twelve weeks of ICF-informed leadership development with steward mentors and a positive psychology coach, followed up at three and six months.";

export const metadata = pageMetadata({
  title: { absolute: "How the ARISE Leadership Transformation Programme Series works" },
  description,
  path: "/programme/",
});

export default function ProgrammePage() {
  return (
    <>
      <PageIntro
        context="ARISE Leadership Transformation Programme Series"
        photo={heroPhotos.programme}
        title="Build the capacity. Change the environment. Measure the participation."
        lede="Each leader chooses two or three role outcomes that matter to them. Mentors, a coach and a sponsor then work on one agreed plan, reviewed against what happens at work."
      />
      <ProgrammeSummarySection />
      <LensesSection detailed />
      <EnginesSection />
      <PositivePsychologySection />
      <MentorshipSection />
      <JourneySection />
      <WeekByWeekSection />
      <IllustrativePlanSection />
      <MeasurementSection />
      <TeamSection />
      <SafeguardsSection />
      <QuestionsSection />
      <ClosingCta
        title={["Start with an entry conversation."]}
        body="We will talk through the role outcome you want, the support you need, and whether the programme is the right fit."
        primary={registerLink}
      />
      <JsonLd data={breadcrumb("Programme", "/programme/")} />
      <JsonLd data={programmeCourse(description)} />
    </>
  );
}
