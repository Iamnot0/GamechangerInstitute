import type { EnquiryFilters } from "@/lib/admin-types";

/** Builds a list URL that keeps the current filters, with overrides. A filter change always resets paging. */
export function enquiriesHref(filters: EnquiryFilters, overrides: Partial<EnquiryFilters> = {}): string {
  const merged: EnquiryFilters = { ...filters, cursor: undefined, ...overrides };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  return `/admin/enquiries/${suffix}`;
}
