import type { Metadata } from "next";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { PostEditor } from "@/components/admin/PostEditor";
import { listMedia } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const result = await load(() => listMedia());
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const media = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <Link href="/admin/posts/" className="admin-page__back">
          News and events
        </Link>
        <h1 className="admin-page__title">New post</h1>
      </header>
      <PostEditor
        post={null}
        images={media.filter((item) => item.kind === "image")}
        videos={media.filter((item) => item.kind === "video")}
      />
    </div>
  );
}
