import type { Metadata } from "next";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { PostEditor } from "@/components/admin/PostEditor";
import { getAdminPost } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";

export const metadata: Metadata = { title: "Edit post" };

export default async function PostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const result = await load(() => getAdminPost(id));
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const post = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <Link href="/admin/posts/" className="admin-page__back">
          News
        </Link>
        <h1 className="admin-page__title">{post.title}</h1>
        {post.status === "published" ? (
          <p className="admin-page__lede">
            On the site at <Link href={`/news/${post.slug}/`}>/news/{post.slug}/</Link>
          </p>
        ) : null}
      </header>
      <PostEditor post={post} />
    </div>
  );
}
