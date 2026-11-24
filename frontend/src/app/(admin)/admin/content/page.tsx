import type { Metadata } from "next";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { listBlocks } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";
import { blockSpecs } from "@/lib/block-specs";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const result = await load(listBlocks);
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const blocks = new Map(result.data.map((block) => [block.key, block]));

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Content</h1>
        <p className="admin-page__lede">Choose a part of the site to edit. Changes stay as a draft until you publish.</p>
      </header>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr>
              <th scope="col">Part of the site</th>
              <th scope="col">Pages</th>
              <th scope="col">What you can change</th>
              <th scope="col">Status</th>
              <th scope="col">Last published</th>
            </tr>
          </thead>
          <tbody>
            {blockSpecs.map((spec) => {
              const block = blocks.get(spec.key);
              return (
                <tr key={spec.key}>
                  <th scope="row">
                    <Link href={`/admin/content/${spec.key}/`} className="admin-table__name">
                      {spec.label}
                    </Link>
                  </th>
                  <td>{spec.pages}</td>
                  <td>{spec.editable}</td>
                  <td>
                    <span className={`status-badge ${block?.has_draft ? "status-badge--draft" : "status-badge--live"}`}>
                      {block?.has_draft ? "Draft waiting" : "Published"}
                    </span>
                  </td>
                  <td>{block?.published_at ? formatDateTime(block.published_at) : "Not yet"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="admin-note">
        The programme pages (lenses, journey, week by week, measurement) stay fixed in the site&rsquo;s design, so a wording
        change cannot break the layout.
      </p>
    </div>
  );
}
