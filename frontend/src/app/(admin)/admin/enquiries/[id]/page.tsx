import type { Metadata } from "next";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { EnquiryFacts } from "@/components/admin/EnquiryFacts";
import { EventTimeline } from "@/components/admin/EventTimeline";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusForm } from "@/components/admin/StatusForm";
import { AdminApiError, getEnquiry } from "@/lib/admin-api";
import type { EnquiryDetail } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Enquiry" };

type Loaded = { enquiry: EnquiryDetail } | { error: AdminApiError };

async function load(id: string): Promise<Loaded> {
  try {
    return { enquiry: await getEnquiry(id) };
  } catch (error) {
    if (error instanceof AdminApiError) return { error };
    throw error;
  }
}

export default async function EnquiryPage({ params }: PageProps<"/admin/enquiries/[id]">) {
  const { id } = await params;
  const result = await load(id);

  if ("error" in result) {
    if (result.error.status !== 404) return <ApiErrorState error={result.error} />;
    return (
      <section className="admin-state" role="alert">
        <h1 className="admin-state__title">This enquiry does not exist</h1>
        <p className="admin-state__body">It may have been removed, or the link is wrong.</p>
        <Link href="/admin/enquiries/" className="button button--secondary">
          Back to enquiries
        </Link>
      </section>
    );
  }

  const { enquiry } = result;
  return (
    <article className="admin-page enquiry" aria-labelledby="enquiry-title">
      <Link href="/admin/enquiries/" className="text-link">
        All enquiries
      </Link>
      <header className="enquiry__header">
        <h1 id="enquiry-title" className="admin-page__title">
          {enquiry.full_name}
        </h1>
        <StatusBadge status={enquiry.status} />
      </header>

      <div className="enquiry__layout">
        <div className="enquiry__main">
          <EnquiryFacts enquiry={enquiry} />
          <section aria-labelledby="enquiry-message-title">
            <h2 id="enquiry-message-title" className="admin-section__title">
              Message
            </h2>
            <p className="enquiry__message">{enquiry.message ?? "No message was left."}</p>
          </section>
        </div>
        <aside className="enquiry__side">
          <section aria-labelledby="status-form-title" className="enquiry__panel">
            <h2 id="status-form-title" className="admin-section__title">
              Status
            </h2>
            <StatusForm key={enquiry.status} enquiryId={enquiry.id} current={enquiry.status} />
          </section>
          <EventTimeline enquiry={enquiry} />
        </aside>
      </div>
    </article>
  );
}
