import type { Photo } from "@/content/institute";

export const successStories = {
  title: "Success stories",
  lede: "Cohorts and workshops GCI has run with leading organisations, delivering capability and job-impact outcomes.",
  note: "These are earlier GCI engagements. The Leadership Transformation Programme pilot has not yet run, and its results will be reported only after follow-up.",
  photos: [
    {
      src: "/images/cohort-1-879.webp",
      width: 879,
      height: 658,
      alt: "A cohort of about twenty-five professionals posing together in an office after a GCI workshop, many giving a thumbs up.",
    },
    {
      src: "/images/cohort-4-737.webp",
      width: 737,
      height: 554,
      alt: "Workshop participants seated in a circle while a facilitator speaks, in a studio with pendant lights.",
    },
    {
      src: "/images/cohort-2-960.webp",
      width: 960,
      height: 375,
      alt: "A group of professionals standing together at the front of a training room, smiling and waving.",
    },
    {
      src: "/images/cohort-3-960.webp",
      width: 960,
      height: 455,
      alt: "A large cohort lined up in a workshop studio under pendant lights, giving a thumbs up.",
    },
    {
      src: "/images/cohort-5-960.webp",
      width: 960,
      height: 499,
      alt: "Participants gathered in front of a wall covered in sticky notes at the end of a design session.",
    },
  ] satisfies Photo[],
  clients: [
    { name: "Hana Bank", src: "/images/clients/hana-bank.webp", width: 200, height: 200 },
    { name: "FWD Insurance", src: "/images/clients/fwd.webp", width: 273, height: 185 },
    { name: "AIA", src: "/images/clients/aia.webp", width: 218, height: 232 },
    { name: "China Eastern Airlines", src: "/images/clients/china-eastern.webp", width: 254, height: 198 },
  ],
} as const;
