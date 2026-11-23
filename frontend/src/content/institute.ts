export type Photo = { src: string; width: number; height: number; alt: string };

export const founder = {
  name: "Dr Benjamin Mah",
  shortName: "DrM",
  title: "Founder and Programme Director",
  role: "Dr Mah founded GameChanger Institute and directs the Leadership Transformation Programme: setting its standards, making every mentor match, and holding supervision and the escalation route.",
  feature:
    "Featured in Singapore Tatler’s August 2017 Master Minds issue: “Benjamin Mah and other disrupters who are changing the way we live.”",
  portrait: {
    src: "/images/benjamin-mah-400.webp",
    width: 400,
    height: 400,
    alt: "Dr Benjamin Mah, Founder and Programme Director of GameChanger Institute.",
  } satisfies Photo,
} as const;

export const stewards = {
  title: "Stewards who have held the role",
  body: "GCI stewards are serving board members, CEOs, CFOs and CTOs. They teach from practice, convene small circles and meet each mentee one-to-one. Mentors are matched on the role the participant is aiming for and on the participant’s own stated preferences.",
} as const;

export const method = {
  title: "One method across everything we run",
  stages: ["Scope", "Frame", "Ideate", "Build"],
  body: "GCI’s design-thinking method frames every engagement. The Leadership Transformation Programme extends it with a fifth stage, Sustain, because a result that fades after the programme is not yet a result.",
} as const;

export const platforms: readonly { name: string; body: string; photo: Photo }[] = [
  {
    name: "Global Leaders Roundtable",
    body: "An invitation-only forum where influential decision-makers convene to explore actionable solutions to today’s most dynamic and complex global challenges.",
    photo: {
      src: "/images/roundtable-640.webp",
      width: 640,
      height: 641,
      alt: "Leaders seated along a roundtable during a discussion.",
    },
  },
  {
    name: "Keynote and Guest of Honour platform",
    body: "Convening leaders and visionaries to explore actionable solutions, on stage and in the room.",
    photo: {
      src: "/images/keynote-640.webp",
      width: 640,
      height: 640,
      alt: "A speaker delivering a keynote at a lectern at a Singapore graduation ceremony.",
    },
  },
  {
    name: "Structuring key partnerships",
    body: "Partnerships that empower the advanced businesses of tomorrow, formalised and carried through.",
    photo: {
      src: "/images/partnership-signing-640.webp",
      width: 640,
      height: 640,
      alt: "Representatives holding signed documents at a memorandum of understanding signing ceremony.",
    },
  },
  {
    name: "Media leaders features",
    body: "Partnering with media and PR leaders to inform and share the solutions of tomorrow, made available today.",
    photo: {
      src: "/images/media-feature-640.webp",
      width: 640,
      height: 640,
      alt: "Singapore Tatler cover, August 2017, featuring Benjamin Mah in the Master Minds issue.",
    },
  },
];

export const appliedAi = {
  title: "Applied AI capability and apprenticeship",
  body: "GCI also helps employers adopt AI through live business use cases while preparing fresh graduates for future-of-work roles, with a proposed collaboration pathway with universities and polytechnics.",
} as const;

export const patron = {
  name: "Shawn Huang Wei Zhong",
  role: "GCI Patron",
  quote:
    "We are in a position of strength. We must continue to invest and position ourselves to be resilient and relevant for the future.",
  photo: {
    src: "/images/patron-640.webp",
    width: 640,
    height: 728,
    alt: "Shawn Huang Wei Zhong speaking during a televised interview.",
  } satisfies Photo,
} as const;

export const showcase: Photo = {
  src: "/images/institute-showcase-1280.webp",
  width: 1280,
  height: 862,
  alt: "GameChanger Institute leaders gathered at the GameChanger stand at an industry event.",
};

export const membershipTiers = ["Member", "Fellow", "Steward Circle", "Enterprise"] as const;
