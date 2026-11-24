import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { listPosts } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "News" };

export default async function PostsPage() {
  const result = await load(listPosts);
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const posts = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header admin-page__header--split">
        <div>
          <h1 className="admin-page__title">News</h1>
          <p className="admin-page__lede">Post photos, a video or an event. Published posts appear on the News page of the site.</p>
        </div>
        <Link href="/admin/posts/new/" className="button button--primary">
          New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="admin-empty">Nothing posted yet. Press New post to add the first one.</p>
      ) : (
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.id} className="post-list__item">
              {post.photos[0] ? (
                <Image src={post.photos[0].src} width={post.photos[0].width} height={post.photos[0].height} alt="" className="post-list__thumb" />
              ) : (
                <span className="post-list__thumb post-list__thumb--none">No photo</span>
              )}
              <div className="post-list__body">
                <Link href={`/admin/posts/${post.id}/`} className="admin-table__name">
                  {post.title}
                </Link>
                <p className="post-list__meta">
                  {post.event_date ? `${formatDay(post.event_date)} · ` : ""}
                  {post.photos.length} {post.photos.length === 1 ? "photo" : "photos"}
                  {post.youtube_id ? " · video" : ""}
                  {post.document ? " · PDF" : ""}
                </p>
              </div>
              <span className={`status-badge ${post.status === "published" ? "status-badge--live" : "status-badge--draft"}`}>
                {post.status === "published" ? "On the site" : "Draft"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
