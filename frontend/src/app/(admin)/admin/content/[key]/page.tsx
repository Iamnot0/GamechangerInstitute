import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { BlockEditor } from "@/components/admin/BlockEditor";
import { getBlock, listMedia } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";
import { emptyBlock, findBlockSpec } from "@/lib/block-specs";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = { title: "Edit content" };

export default async function BlockPage({ params }: PageProps<"/admin/content/[key]">) {
  const spec = findBlockSpec((await params).key);
  if (!spec) notFound();

  const result = await load(() => Promise.all([getBlock(spec.key), listMedia("image"), getSiteContent()]));
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const [block, images, current] = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <Link href="/admin/content/" className="admin-page__back">
          Content
        </Link>
        <h1 className="admin-page__title">{spec.label}</h1>
        <p className="admin-page__lede">Shown on: {spec.pages}.</p>
      </header>
      <BlockEditor spec={spec} block={block} images={images} current={current} initial={block.draft ?? block.published ?? emptyBlock(spec)} />
    </div>
  );
}
