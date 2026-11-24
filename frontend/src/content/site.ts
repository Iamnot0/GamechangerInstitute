export const site = {
  name: "GameChanger Institute",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://gamechanger.institute",
  description:
    "ARISE Leadership Transformation Programme Series: an ICF-informed path from capacity to performance, with steward mentors and a positive psychology coach.",
  tagline: ["Build the capacity.", "Change the environment.", "Measure the participation."],
} as const;

export type SocialNetwork = "LinkedIn" | "Facebook" | "X";

/** The Institute's pages on each network. A null address shows the mark without a link. */
export const socialProfiles: readonly { network: SocialNetwork; url: string | null }[] = [
  { network: "LinkedIn", url: null },
  { network: "Facebook", url: null },
  { network: "X", url: null },
];

export const programmeName = "ARISE Leadership Transformation Programme Series";

export type NavItem = { href: string; label: string };

export const primaryNav: readonly NavItem[] = [
  { href: "/programme/", label: "Programme" },
  { href: "/organisations/", label: "For organisations" },
  { href: "/institute/", label: "The Institute" },
  { href: "/news/", label: "Media" },
];

export const registerLink: NavItem = { href: "/register/", label: "Register interest" };

export const footerNav: readonly NavItem[] = [
  ...primaryNav,
  registerLink,
  { href: "/privacy/", label: "Privacy notice" },
];
