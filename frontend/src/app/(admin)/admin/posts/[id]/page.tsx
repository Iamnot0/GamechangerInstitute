import type { Metadata } from "next";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { PostEditor } from "@/components/admin/PostEditor";
import { getAdminPost, listMedia } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";

export const metadata: Metadata = { title: "Edit post" };

export default async function PostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const result = await load(() => Promise.all([getAdminPost(id), listMedia()]));
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const [post, media] = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <Link href="/admin/posts/" className="admin-page__back">
          News and events
        </Link>
        <h1 className="admin-page__title">{post.title}</h1>
      </header>
      <PostEditor
        post={post}
        images={media.filter((item) => item.kind === "image")}
        videos={media.filter((item) => item.kind === "video")}
      />
    </div>
  );
}
