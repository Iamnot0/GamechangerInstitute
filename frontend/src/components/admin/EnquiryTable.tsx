import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { enquiriesHref } from "@/lib/admin-links";
import { kindLabels, type EnquiryFilters, type EnquiryPage } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/format";

type EnquiryTableProps = { page: EnquiryPage; filters: EnquiryFilters };

export function EnquiryTable({ page, filters }: EnquiryTableProps) {
  const filtered = Boolean(filters.status || filters.kind || filters.q);

  if (page.items.length === 0) {
    return (
      <div className="admin-state admin-state--inline" role="status">
        {filtered ? (
          <>
            <p className="admin-state__title">No enquiries match these filters.</p>
            <Link href="/admin/enquiries/" className="text-link">
              Show all enquiries
            </Link>
          </>
        ) : (
          <>
            <p className="admin-state__title">No enquiries yet.</p>
            <p className="admin-state__body">Registrations from the website appear here as soon as they arrive.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="admin-table">
      <table className="admin-table__table">
        <caption className="visually-hidden">Enquiries, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Received</th>
            <th scope="col">Name</th>
            <th scope="col">Organisation</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((item) => (
            <tr key={item.id}>
              <td data-label="Received">{formatDateTime(item.created_at)}</td>
              <th scope="row" data-label="Name">
                <Link href={`/admin/enquiries/${item.id}/`} className="admin-table__name">
                  {item.full_name}
                </Link>
                <span className="admin-table__email">{item.email}</span>
              </th>
              <td data-label="Organisation">{item.organisation ?? "None given"}</td>
              <td data-label="Type">{kindLabels[item.kind]}</td>
              <td data-label="Status">
                <StatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <nav className="admin-table__paging" aria-label="Pages">
        {filters.cursor ? (
          <Link href={enquiriesHref(filters)} className="text-link">
            First page
          </Link>
        ) : null}
        {page.next_cursor ? (
          <Link href={enquiriesHref(filters, { cursor: page.next_cursor })} className="button button--secondary">
            Next page
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
