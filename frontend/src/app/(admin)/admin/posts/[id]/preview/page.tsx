import type { Metadata } from "next";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { PostView } from "@/components/media/PostView";
import { getAdminPost } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";

export const metadata: Metadata = { title: "Preview" };

export default async function PostPreviewPage({ params }: PageProps<"/admin/posts/[id]/preview">) {
  const { id } = await params;
  const result = await load(() => getAdminPost(id));
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const post = result.data;
  const live = post.status === "published";

  return (
    <div className="post-preview">
      <p className="post-preview__notice" role="status">
        <strong>Preview.</strong> {live ? "This is on the site now." : "This is a draft. Readers cannot see it until you publish it."}
        <Link href={`/admin/posts/${post.id}/`}>Back to editing</Link>
      </p>
      <div className="post-preview__page">
        <PostView post={{ ...post, published_at: post.published_at ?? post.updated_at }} otherArticles={[]} />
      </div>
    </div>
  );
}
