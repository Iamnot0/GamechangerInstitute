import type { Metadata } from "next";
import Link from "next/link";
import { PostEditor } from "@/components/admin/PostEditor";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <Link href="/admin/posts/" className="admin-page__back">
          Media
        </Link>
        <h1 className="admin-page__title">New post</h1>
      </header>
      <PostEditor post={null} />
    </div>
  );
}
