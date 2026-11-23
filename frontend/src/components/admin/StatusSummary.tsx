import Link from "next/link";
import { enquiriesHref } from "@/lib/admin-links";
import { enquiryStatuses, statusLabels, type EnquiryFilters, type EnquirySummary } from "@/lib/admin-types";

type StatusSummaryProps = { summary: EnquirySummary; filters: EnquiryFilters };

export function StatusSummary({ summary, filters }: StatusSummaryProps) {
  const tabs = [
    { label: "All", count: summary.total, status: undefined },
    ...enquiryStatuses.map((status) => ({ label: statusLabels[status], count: summary.by_status[status], status })),
  ];

  return (
    <nav className="status-tabs" aria-label="Filter by status">
      <ul className="status-tabs__list">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              href={enquiriesHref(filters, { status: tab.status })}
              className="status-tabs__tab"
              aria-current={filters.status === tab.status ? "page" : undefined}
            >
              {tab.label}
              <span className="status-tabs__count">{tab.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
