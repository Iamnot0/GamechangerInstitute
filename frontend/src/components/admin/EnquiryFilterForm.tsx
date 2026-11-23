import Link from "next/link";
import { kindLabels, type EnquiryFilters } from "@/lib/admin-types";
import { enquiryKinds } from "@/lib/enquiry";

type EnquiryFilterFormProps = { filters: EnquiryFilters };

export function EnquiryFilterForm({ filters }: EnquiryFilterFormProps) {
  const hasFilters = Boolean(filters.kind || filters.q);

  return (
    <form className="admin-filters" method="get" action="/admin/enquiries/" role="search">
      {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
      <div className="admin-filters__field">
        <label htmlFor="filter-q" className="form-field__label">
          Search
        </label>
        <input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Name, email or organisation"
          maxLength={100}
          className="form-control"
        />
      </div>
      <div className="admin-filters__field">
        <label htmlFor="filter-kind" className="form-field__label">
          Type
        </label>
        <select id="filter-kind" name="kind" defaultValue={filters.kind ?? ""} className="form-control form-control--select">
          <option value="">All types</option>
          {enquiryKinds.map((kind) => (
            <option key={kind} value={kind}>
              {kindLabels[kind]}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-filters__actions">
        <button type="submit" className="button button--primary">
          Apply
        </button>
        {hasFilters ? (
          <Link href={filters.status ? `/admin/enquiries/?status=${filters.status}` : "/admin/enquiries/"} className="text-link">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
