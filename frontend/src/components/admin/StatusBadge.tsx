import { statusLabels, type EnquiryStatus } from "@/lib/admin-types";

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabels[status]}</span>;
}
