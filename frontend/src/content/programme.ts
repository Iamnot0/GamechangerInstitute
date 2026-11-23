export const glance = {
  caption: "Planning assumptions for the pilot design, to be confirmed before launch.",
  facts: [
    { value: "12", label: "weeks of structured programme" },
    { value: "6", label: "months of follow-up after completion" },
    { value: "12", label: "leaders per cohort, in circles of four" },
    { value: "2–3", label: "participation goals per leader, in their own words" },
    { value: "3", label: "steward mentors per cohort, about 2.5 hours a week each" },
    { value: "4", label: "outcome questions, each reported separately" },
  ],
} as const;

export const principle = {
  title: "Development trains capacity. Results need performance.",
  capacity: {
    term: "Capacity",
    definition: "What a leader can do in a standard setting: the workshop, the case study, the coaching room.",
  },
  performance: {
    term: "Performance",
    definition:
      "What the leader actually does in their own environment: the Monday meeting, the sceptical board, the stretched team.",
  },
  gap: "When the two differ, the gap points to the environment: a barrier to remove or a support to keep.",
  source:
    "The WHO International Classification of Functioning, Disability and Health (ICF) draws this distinction for health and functioning. The programme applies it to leadership, so every plan works on the person, the task and the setting together.",
} as const;

export type Lens = {
  id: string;
  icf: string;
  question: string;
  name: string;
  translation: string;
  recorded: string;
};

export const lenses: readonly Lens[] = [
  {
    id: "inner",
    icf: "Body functions (psychological)",
    question: "Which functions affect the person’s goals?",
    name: "Inner capacities",
    translation: "Energy, attention, emotional regulation, confidence.",
    recorded: "Wellbeing and psychological capital measures; coach observation.",
  },
  {
    id: "tasks",
    icf: "Activities",
    question: "Which tasks are difficult or achievable?",
    name: "Leadership tasks",
    translation: "Deciding, delegating, giving feedback, planning.",
    recorded: "Task observation against criteria agreed in advance.",
  },
  {
    id: "roles",
    icf: "Participation",
    question: "Which life roles does the person want to enter or sustain?",
    name: "Roles",
    translation: "First-time manager, founder, new executive, successor, returner.",
    recorded: "Two or three participation goals with baseline and review date.",
  },
  {
    id: "context",
    icf: "Environmental factors",
    question: "Which features of the setting help or hinder?",
    name: "Context",
    translation: "Culture, sponsor, team, workload, decision rights, attitudes.",
    recorded: "Barriers and facilitators, each with an owner.",
  },
  {
    id: "story",
    icf: "Personal factors",
    question: "What matters in this person’s history and preferences?",
    name: "Story",
    translation: "Strengths, values, culture and coping preferences, in narrative form.",
    recorded: "Narrative, in the participant’s words; never coded or scored.",
  },
];

export const lensesNote =
  "The leadership translation is GCI’s own design application. It is not a WHO-prescribed programme or an official ICF Core Set, and participants are not coded.";

export const engines = [
  {
    name: "ICF structure",
    contributes:
      "A shared language for goals, tasks, roles and environment, so mentor, coach and sponsor work on the same plan.",
    doesNot: "Choose the intervention or prove that it works.",
  },
  {
    name: "Mentorship",
    contributes:
      "GCI stewards, serving board members, CEOs, CFOs and CTOs, who have held the role the participant is aiming for.",
    doesNot: "Replace the sponsor who controls the participant’s working environment.",
  },
  {
    name: "Positive psychology",
    contributes:
      "Practices that build on what is already strong: character strengths, hope, efficacy, resilience, optimism and meaning.",
    doesNot: "Provide clinical assessment or treatment.",
  },
] as const;

export const enginesNote =
  "All three contribute to one agreed plan, reviewed against observable results in the participant’s real environment.";

export type Stage = {
  number: number;
  name: string;
  when: string;
  summary: string;
  startWeek: number;
  endWeek: number;
};

export const stages: readonly Stage[] = [
  {
    number: 1,
    name: "Scope",
    when: "Weeks 1–2",
    summary: "Entry conversation. Five-lens profile. Baseline measures. Mentor and sponsor matched.",
    startWeek: 1,
    endWeek: 2,
  },
  {
    number: 2,
    name: "Frame",
    when: "Weeks 3–4",
    summary: "Two or three participation goals, each with a baseline, a review date and observable criteria.",
    startWeek: 3,
    endWeek: 4,
  },
  {
    number: 3,
    name: "Ideate",
    when: "Weeks 5–6",
    summary: "Design the experiments: strengths to use, tasks to practise, environmental changes with named owners.",
    startWeek: 5,
    endWeek: 6,
  },
  {
    number: 4,
    name: "Build",
    when: "Weeks 7–12",
    summary: "Practise in the real setting. Fortnightly review. Environmental actions delivered and confirmed.",
    startWeek: 7,
    endWeek: 12,
  },
];

export const sustainStage = {
  number: 5,
  name: "Sustain",
  when: "Months 3 and 6 after",
  summary: "Follow up on whether the role outcome held, and what support it still needs.",
} as const;

export const journeyNote =
  "Scope, Frame, Ideate and Build are GCI’s existing design-thinking method. Sustain is added because a result that fades after the programme is not yet a result.";

export const weeks = [
  { week: 1, stage: "Scope", milestone: "Entry conversation; information-sharing agreement; baseline measures", sessions: "Masterclass 1; practice lab 1" },
  { week: 2, stage: "Scope", milestone: "Five-lens profile complete; mentor and sponsor matched", sessions: "Circle 1; one-to-one 1" },
  { week: 3, stage: "Frame", milestone: "Two or three participation goals drafted", sessions: "Masterclass 2; practice lab 2" },
  { week: 4, stage: "Frame", milestone: "Goals agreed with baseline, criteria and review date; sponsor compact signed (corporate track)", sessions: "Circle 2; one-to-one 2" },
  { week: 5, stage: "Ideate", milestone: "Experiments designed for each goal", sessions: "Masterclass 3; practice lab 3" },
  { week: 6, stage: "Ideate", milestone: "Environmental actions assigned to named owners", sessions: "Circle 3; one-to-one 3" },
  { week: 7, stage: "Build", milestone: "First experiments run at work", sessions: "Masterclass 4; practice lab 4" },
  { week: 8, stage: "Build", milestone: "Mid-point review: wellbeing, tasks and participation asked about separately", sessions: "Circle 4; one-to-one 4" },
  { week: 9, stage: "Build", milestone: "Experiments adjusted; environmental actions checked", sessions: "Masterclass 5; practice lab 5" },
  { week: 10, stage: "Build", milestone: "Confirmation that agreed changes happened", sessions: "Circle 5; one-to-one 5" },
  { week: 11, stage: "Build", milestone: "Maintenance plan drafted", sessions: "Masterclass 6; practice lab 6" },
  { week: 12, stage: "Build", milestone: "Completion measures; goals scored; summary of progress, remaining needs and support required", sessions: "Circle 6; one-to-one 6" },
] as const;

export const reviewQuestions = [
  "Has the participant’s wellbeing changed?",
  "Have the tasks become easier?",
  "Is the participant doing more of what matters in the role?",
] as const;

export const perma = [
  { letter: "P", name: "Positive emotion" },
  { letter: "E", name: "Engagement" },
  { letter: "R", name: "Relationships" },
  { letter: "M", name: "Meaning" },
  { letter: "A", name: "Accomplishment" },
] as const;

export const psychologicalCapital = [
  { name: "Hope", gloss: "the will and the way" },
  { name: "Efficacy", gloss: "confidence to act" },
  { name: "Resilience", gloss: "recovering from setbacks" },
  { name: "Optimism", gloss: "realistic expectation" },
] as const;

export const practiceLab = [
  { name: "Strengths in use", detail: "Name top strengths; use one in a new way each week." },
  { name: "Best possible self", detail: "Write the role outcome as if already achieved." },
  { name: "Job crafting", detail: "Reshape tasks and relationships toward strengths." },
  { name: "Three good things", detail: "Record what went well, and why." },
] as const;

export const positivePsychologyEvidence =
  "Meta-analyses report small to moderate average gains in wellbeing from these practices. They are useful and inexpensive. They are not a treatment for clinical conditions.";

export const mentorshipFormats = [
  {
    name: "Steward masterclass",
    rhythm: "90 minutes, alternate weeks",
    week: "A",
    purpose: "A serving board member or C-suite leader teaches one leadership task from lived practice.",
  },
  {
    name: "Positive psychology practice lab",
    rhythm: "60 minutes, alternate weeks",
    week: "A",
    purpose: "One practice introduced, tried and planned into the coming fortnight.",
  },
  {
    name: "Mentorship circle",
    rhythm: "90 minutes, alternate weeks",
    week: "B",
    purpose: "Four participants and one steward work through each other’s live goals.",
  },
  {
    name: "Matched one-to-one",
    rhythm: "45 minutes a fortnight",
    week: "B",
    purpose: "Review progress against the participant’s own goals and agree the next experiment.",
  },
] as const;

export const mentorshipLoad =
  "Participants spend about 2.5 hours a week in sessions, plus practice at work. Each steward gives about 2.5 hours a week to four mentees. Three stewards serve a cohort of twelve.";

export const mentorshipEvidence =
  "Mentoring and coaching meta-analyses find favourable but modest average effects. The quality of the match and the participant’s environment decide how much.";

export const illustrativePlan = {
  title: "A newly promoted head of engineering",
  context:
    "Leads a team of 25 for the first time. Strong technical judgement, a habit of making every release decision personally, and one-to-ones that have lapsed under delivery pressure. In a role-play the participant delegates clearly; at work the weekly release decision has not been handed over once.",
  goal:
    "By week 12, hold fortnightly one-to-ones with all six direct reports for eight consecutive weeks, and hand the weekly release decision to a deputy.",
  goalNote: "The numbers make the goal measurable. They are not a predicted result.",
  rows: [
    { lens: "Inner capacities", action: "Coaching on confidence and recovery; strengths profile", evidence: "Wellbeing and psychological capital at baseline and week 12" },
    { lens: "Leadership tasks", action: "Practise delegation and feedback conversations with the mentor", evidence: "Conversations held; decisions actually handed over" },
    { lens: "Role", action: "Sustain leading a 25-person team", evidence: "One-to-ones held for eight weeks; deputy owns the release call" },
    { lens: "Environment", action: "Sponsor protects two hours a week and removes on-call duty", evidence: "Confirmation the changes happened and stayed" },
    { lens: "Story", action: "Values and working preferences, in the participant’s words", evidence: "Used for mentor matching; never scored" },
    { lens: "Follow-up", action: "Review at three and six months", evidence: "Is the pattern still running?" },
  ],
} as const;

export const measures = [
  {
    number: 1,
    name: "Fidelity",
    question: "Do mentors and coaches use the model consistently?",
    instruments: "Plans completed on time; goals with named owners; case-review audit.",
    cannotShow: "That participants benefited.",
  },
  {
    number: 2,
    name: "Capacity",
    question: "Do wellbeing and psychological capital improve?",
    instruments: "PERMA-Profiler; Psychological Capital Questionnaire; WHO-5 Well-Being Index.",
    cannotShow: "That the programme caused the change, or that the role outcome followed.",
  },
  {
    number: 3,
    name: "Participation",
    question: "Does the leader sustain the role outcome they chose?",
    instruments: "Goal Attainment Scaling; observed behaviour; status at three and six months.",
    cannotShow: "That every component or cohort has the same benefit.",
  },
  {
    number: 4,
    name: "Delivery",
    question: "Is the programme accessible and financially deliverable?",
    instruments: "Waiting time; dropout reasons; cost per enrolled and per completed participant.",
    cannotShow: "That results transfer to other settings without local evaluation.",
  },
] as const;

export const measuresNote =
  "Improvement in one does not demonstrate improvement in the others. A better wellbeing score is not a participation result.";

export const pilotTargets = {
  caption:
    "Management targets set in advance for the pilot. They are not WHO standards or predicted success rates, and they will be revised if pilot data show they are unrealistic.",
  targets: [
    { value: "90%", text: "have agreed goals, named owners and a baseline within two weeks" },
    { value: "85%", text: "have paired baseline and completion data, with reasons for anything missing" },
    { value: "75%", text: "respond at three-month follow-up, withdrawals included" },
  ],
  reporting: [
    { name: "Goal outcomes", text: "Reported as achieved, partly achieved, not achieved or unknown." },
    { name: "Sustained participation", text: "Status at three and six months, with the eligible population defined." },
    { name: "Experience and adverse events", text: "Feedback, deterioration and complaints recorded and reviewed." },
    { name: "Delivery and access", text: "Waiting time, cost, dropout reasons and affordability barriers." },
  ],
  selectionNote:
    "A higher completion rate is not an improvement if entry becomes more selective. We report who applied, who was accepted and why others were redirected.",
} as const;

export const team = [
  { role: "Programme director", responsibility: "Sets standards, matches mentors, handles escalation." },
  { role: "Steward mentor", responsibility: "Brings experience of the target role; runs the circle and the fortnightly one-to-one." },
  { role: "Positive psychology coach", responsibility: "Leads strengths, psychological capital and wellbeing practice. Non-clinical." },
  { role: "Coordinator and outcomes lead", responsibility: "Keeps one integrated plan per participant; owns data quality and follow-up." },
  { role: "Organisational sponsor", responsibility: "Owns the environmental actions in the participant’s workplace." },
  { role: "Clinical referral partner", responsibility: "Registered professionals for needs beyond the scope of coaching." },
] as const;

export const integrity = {
  is: [
    "ICF-informed leadership development, described factually.",
    "Mentoring and coaching by experienced leaders and a credentialed coach.",
    "Evaluated prospectively, with neutral and negative results kept.",
  ],
  isNot: [
    "WHO-accredited or WHO-endorsed. Adopting the ICF confers neither.",
    "A clinical psychology service. No diagnosis, no therapy, and a clear referral route.",
    "A coding exercise. No ICF qualifiers, and no individual record shared with an employer.",
  ],
  closing: "No success rate is announced until follow-up has happened.",
} as const;

export const safeguards = [
  {
    title: "A non-clinical programme with a referral route",
    body: "The programme offers education, mentoring and coaching. It does not screen for, diagnose or treat any condition. If a participant’s wellbeing scores stay low, or distress or risk becomes apparent, the coach offers a referral to a registered clinical partner and the programme director reviews whether the programme remains suitable.",
  },
  {
    title: "The participant owns the record",
    body: "Each participant owns their five-lens profile and decides what is shared. An employer may need agreed adjustments and work-related goals. It does not receive scores, coaching notes or the participant’s story.",
  },
  {
    title: "Consent for every disclosure",
    body: "Each disclosure has a stated purpose, a named recipient and the participant’s consent, in line with Singapore’s Personal Data Protection Act.",
  },
  {
    title: "Coaching and clinical care kept separate",
    body: "MOH’s parliamentary answer of 4 November 2026 states that clinical psychologists will be regulated under the Allied Health Professions Act, with requirements to be announced in early 2027. The programme keeps coaching and clinical care organisationally distinct.",
  },
] as const;

export const questions = [
  {
    q: "Is the programme accredited or endorsed by the WHO?",
    a: "No. The programme is ICF-informed: it borrows the structure of the WHO International Classification of Functioning, Disability and Health. Adopting the classification does not confer WHO accreditation, endorsement or permission to use WHO branding.",
  },
  {
    q: "Is this therapy?",
    a: "No. It is leadership development through mentoring and coaching. It does not diagnose or treat. When needs go beyond the scope of coaching, there is a referral route to registered clinicians.",
  },
  {
    q: "How much time does it take?",
    a: "About 2.5 hours a week in sessions across twelve weeks, plus practice at work. Sessions alternate fortnightly between a masterclass with a practice lab, and a mentorship circle with a one-to-one.",
  },
  {
    q: "What does my employer see?",
    a: "On the corporate track, the organisation sees themes and agreed adjustments in aggregate. It never receives an individual’s profile, scores, coaching notes or story.",
  },
  {
    q: "How are results reported?",
    a: "Four questions are measured separately: fidelity, capacity, participation and delivery. Results are reported with denominators, including withdrawals, and only after follow-up at three and six months.",
  },
] as const;
