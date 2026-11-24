export const site = {
  name: "GameChanger Institute",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://gamechanger.institute",
  description:
    "The ARISE Leadership Transformation Program Series: an ICF-informed pathway to positive transformation for individuals and organisations, through mentorship and positive psychology support.",
  tagline: ["Build the capacity.", "Change the environment.", "Measure the participation."],
} as const;

export type NavItem = { href: string; label: string };

export const primaryNav: readonly NavItem[] = [
  { href: "/programme/", label: "Programme" },
  { href: "/organisations/", label: "For organisations" },
  { href: "/institute/", label: "The Institute" },
];

export const registerLink: NavItem = { href: "/register/", label: "Register interest" };

export const footerNav: readonly NavItem[] = [
  ...primaryNav,
  registerLink,
  { href: "/privacy/", label: "Privacy notice" },
];
