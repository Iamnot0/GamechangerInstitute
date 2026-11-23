export const enquiryKinds = ["individual", "organisation", "general"] as const;
export type EnquiryKind = (typeof enquiryKinds)[number];

export const roleTransitions = [
  { value: "first_time_manager", label: "First-time manager" },
  { value: "founder", label: "Founder" },
  { value: "new_executive", label: "New executive" },
  { value: "successor", label: "Successor" },
  { value: "returner", label: "Returning after a break" },
  { value: "other", label: "Another transition" },
] as const;
export type RoleTransition = (typeof roleTransitions)[number]["value"];

export type EnquiryPayload = {
  kind: EnquiryKind;
  full_name: string;
  email: string;
  organisation: string | null;
  role_title: string | null;
  role_transition: RoleTransition | null;
  cohort_size: number | null;
  message: string | null;
  consent: boolean;
  website: string;
};

export type EnquiryField = Exclude<keyof EnquiryPayload, "website">;
export type FieldErrors = Partial<Record<EnquiryField, string>>;

export const limits = {
  fullName: { min: 2, max: 120 },
  email: 254,
  organisation: 160,
  roleTitle: 120,
  message: 2000,
  cohortSize: { min: 1, max: 500 },
} as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEnquiry(payload: EnquiryPayload): FieldErrors {
  const errors: FieldErrors = {};
  const name = payload.full_name.trim();

  if (name.length < limits.fullName.min) errors.full_name = "Enter your full name.";
  else if (name.length > limits.fullName.max) errors.full_name = `Keep your name under ${limits.fullName.max} characters.`;

  if (!emailPattern.test(payload.email.trim())) errors.email = "Enter an email address like name@company.com.";

  if (payload.kind === "organisation" && !payload.organisation?.trim()) {
    errors.organisation = "Enter your organisation’s name.";
  }

  const size = payload.cohort_size;
  if (size !== null && (!Number.isInteger(size) || size < limits.cohortSize.min || size > limits.cohortSize.max)) {
    errors.cohort_size = `Enter a whole number between ${limits.cohortSize.min} and ${limits.cohortSize.max}.`;
  }

  if (!payload.consent) errors.consent = "Confirm you agree to how we use your details.";

  return errors;
}
