import type { Metadata } from "next";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { EnquiryFilterForm } from "@/components/admin/EnquiryFilterForm";
import { EnquiryTable } from "@/components/admin/EnquiryTable";
import { StatusSummary } from "@/components/admin/StatusSummary";
import { AdminApiError, getEnquirySummary, listEnquiries } from "@/lib/admin-api";
import {
  enquiryStatuses,
  type EnquiryFilters,
  type EnquiryPage,
  type EnquiryStatus,
  type EnquirySummary,
} from "@/lib/admin-types";
import { enquiryKinds, type EnquiryKind } from "@/lib/enquiry";

export const metadata: Metadata = { title: "Enquiries" };

type SearchParams = Record<string, string | string[] | undefined>;
type Loaded = { page: EnquiryPage; summary: EnquirySummary } | { error: AdminApiError };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
const isStatus = (value?: string): value is EnquiryStatus => enquiryStatuses.includes(value as EnquiryStatus);
const isKind = (value?: string): value is EnquiryKind => enquiryKinds.includes(value as EnquiryKind);

function parseFilters(params: SearchParams): EnquiryFilters {
  const status = first(params.status);
  const kind = first(params.kind);
  return {
    status: isStatus(status) ? status : undefined,
    kind: isKind(kind) ? kind : undefined,
    q: first(params.q)?.slice(0, 100),
    cursor: first(params.cursor)?.slice(0, 200),
  };
}

async function load(filters: EnquiryFilters): Promise<Loaded> {
  try {
    const [page, summary] = await Promise.all([listEnquiries(filters), getEnquirySummary()]);
    return { page, summary };
  } catch (error) {
    if (error instanceof AdminApiError) return { error };
    throw error;
  }
}

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const filters = parseFilters(await searchParams);
  const result = await load(filters);

  if ("error" in result) return <ApiErrorState error={result.error} />;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Enquiries</h1>
        <p className="admin-page__lede">Registrations of interest from the website, newest first.</p>
      </header>
      <StatusSummary summary={result.summary} filters={filters} />
      <EnquiryFilterForm filters={filters} />
      <EnquiryTable page={result.page} filters={filters} />
    </div>
  );
}
