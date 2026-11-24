import type { Metadata } from "next";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { listPosts } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "News and events" };

export default async function PostsPage() {
  const result = await load(listPosts);
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const posts = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header admin-page__header--split">
        <div>
          <h1 className="admin-page__title">News and events</h1>
          <p className="admin-page__lede">Posts shown on the public News and events page, newest first.</p>
        </div>
        <Link href="/admin/posts/new/" className="button button--primary">
          Write a post
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="admin-empty">No posts yet. The public page says so until the first one is published.</p>
      ) : (
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Event date</th>
                <th scope="col">Last changed</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <th scope="row">
                    <Link href={`/admin/posts/${post.id}/`} className="admin-table__name">
                      {post.title}
                    </Link>
                  </th>
                  <td>
                    <span className={`status-badge ${post.status === "published" ? "status-badge--live" : "status-badge--draft"}`}>
                      {post.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>{post.event_date ?? "None"}</td>
                  <td>{formatDateTime(post.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
