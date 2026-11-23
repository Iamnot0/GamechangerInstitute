export type TrackRow = { label: string; individual: string; corporate: string };

export const tracks: { intro: string; rows: readonly TrackRow[]; note: string } = {
  intro: "Only the route to the environment changes.",
  rows: [
    {
      label: "For",
      individual:
        "Leaders at a role transition: first-time managers, founders, new executives, successors, leaders returning after a break.",
      corporate: "Cohorts of 8 to 12 leaders from one organisation.",
    },
    {
      label: "Entry",
      individual: "Personal application, or through GCI membership.",
      corporate: "An enterprise engagement with a named executive sponsor.",
    },
    {
      label: "Environment",
      individual:
        "The participant recruits a sponsor where one exists; otherwise the plan concentrates on what the participant controls.",
      corporate: "Each participant’s line sponsor signs a compact of dated actions.",
    },
    {
      label: "Reporting",
      individual: "The participant owns the record.",
      corporate: "The organisation sees themes and agreed adjustments, in aggregate.",
    },
    {
      label: "Follow-up",
      individual: "Three and six months.",
      corporate: "Three and six months, plus a check that adjustments are still in place.",
    },
  ],
  note: "Same five-lens profile, same goals discipline, same follow-up at three and six months.",
};

export const corporateAdditions = [
  {
    name: "Sponsor compact",
    body: "Each line sponsor commits to two or three named changes with dates, such as protected time, clearer decision rights or a different brief.",
  },
  {
    name: "Environment scan",
    body: "Workload, meeting load, decision rights and psychological safety are examined, and each finding is recorded as a barrier or a facilitator. Refusals and unresolved barriers are documented, because they affect how outcomes should be read.",
  },
  {
    name: "Strengths-based inquiry",
    body: "One working session with participants and sponsors on what already works in the organisation, using the four Appreciative Inquiry stages: Discover, Dream, Design, Destiny.",
  },
  {
    name: "Aggregate reporting",
    body: "The organisation receives themes, adjustments made and goal outcomes by category. It never receives an individual’s profile, scores or coaching record.",
  },
] as const;

export const accountabilityQuote = {
  text: "A recommendation in a report has limited practical value if no person or organisation is responsible for carrying it out.",
  source: "WHO ICF implementation report, section 5",
  consequence: "So every environmental action has an owner, a date and a check that it happened.",
} as const;

export const corporatePlan = {
  title: "A 300-person professional services firm enrols ten newly promoted team leaders",
  brief:
    "The executive sponsor wants the new leaders to hold regular one-to-ones and to stop escalating routine decisions to partners.",
  rows: [
    {
      element: "Environment scan",
      action: "Short survey and interviews on workload, meeting load, decision rights and psychological safety",
      owner: "Coordinator with the firm’s HR lead",
      evidence: "Barriers and facilitators agreed with the executive sponsor",
    },
    {
      element: "Sponsor compacts",
      action: "Each line sponsor signs two or three dated actions",
      owner: "Line sponsors",
      evidence: "Actions confirmed at weeks 6 and 10",
    },
    {
      element: "Strengths-based inquiry",
      action: "Half-day session with participants and sponsors on what already works",
      owner: "Positive psychology coach",
      evidence: "Three practices the firm commits to keep",
    },
    {
      element: "Individual plans",
      action: "Two or three participation goals per leader",
      owner: "Participant and steward mentor",
      evidence: "Goal attainment at week 12",
    },
    {
      element: "Aggregate report",
      action: "Themes, adjustments made and goal outcomes by category",
      owner: "Outcomes lead",
      evidence: "Report to the executive sponsor; no individual data",
    },
    {
      element: "Follow-up",
      action: "Role status and whether adjustments are still in place",
      owner: "Coordinator",
      evidence: "Three and six months",
    },
  ],
} as const;

export const rollout = {
  caption: "Eighteen months from design to a reviewed result. Timing is illustrative.",
  phases: [
    {
      period: "Months 1–3",
      name: "Design",
      work: "Confirm demand. Appoint leads. Train and calibrate stewards on shared cases. Sign the referral partner.",
      gate: "Clear scope, a usable record, agreed outcome definitions.",
    },
    {
      period: "Months 4–6",
      name: "First cohort",
      work: "Run one open cohort of twelve. Review early cases and administration time.",
      gate: "Shared plan used as designed; manageable burden on participants.",
    },
    {
      period: "Months 7–12",
      name: "Second and corporate cohorts",
      work: "Run a second open cohort and the first corporate cohort. Begin three-month follow-ups.",
      gate: "Reliable outcome capture; documented delivery cost.",
    },
    {
      period: "Months 13–18",
      name: "Review",
      work: "Complete six-month follow-ups. Review sustained results.",
      gate: "Credible participation results and a funded plan.",
    },
  ],
} as const;
