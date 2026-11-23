import type { EnquiryKind, RoleTransition } from "@/lib/enquiry";

export const enquiryStatuses = ["new", "contacted", "closed"] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

export const statusLabels: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

export const kindLabels: Record<EnquiryKind, string> = {
  individual: "Individual",
  organisation: "Organisation",
  general: "General",
};

export type EnquirySummary = {
  total: number;
  by_status: Record<EnquiryStatus, number>;
  by_kind: Record<EnquiryKind, number>;
};

export type EnquiryListItem = {
  id: string;
  kind: EnquiryKind;
  full_name: string;
  email: string;
  organisation: string | null;
  role_title: string | null;
  status: EnquiryStatus;
  created_at: string;
  notified_at: string | null;
};

export type EnquiryPage = {
  items: EnquiryListItem[];
  next_cursor: string | null;
};

export type EnquiryEvent = {
  id: string;
  actor_sub: string;
  actor_email: string | null;
  action: "status_changed";
  from_status: EnquiryStatus | null;
  to_status: EnquiryStatus | null;
  note: string | null;
  created_at: string;
};

export type EnquiryDetail = EnquiryListItem & {
  role_transition: RoleTransition | null;
  cohort_size: number | null;
  message: string | null;
  consent_version: string;
  consent_at: string;
  updated_at: string;
  events: EnquiryEvent[];
};

export type EnquiryFilters = {
  status?: EnquiryStatus;
  kind?: EnquiryKind;
  q?: string;
  cursor?: string;
};
