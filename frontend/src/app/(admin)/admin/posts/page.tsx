import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { listPosts } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";
import { postKinds, type AdminPost } from "@/lib/admin-types";
import { kindLabels } from "@/lib/media-kinds";

export const metadata: Metadata = { title: "Media" };

function Thumbnail({ post }: { post: AdminPost }) {
  const photo = post.photos[0];
  if (photo) return <Image src={photo.src} width={photo.width} height={photo.height} alt="" className="post-list__thumb" />;
  if (post.youtube_id) {
    return <Image src={`https://i.ytimg.com/vi/${post.youtube_id}/hqdefault.jpg`} width={480} height={360} alt="" className="post-list__thumb" />;
  }
  return <span className="post-list__thumb post-list__thumb--none">{post.kind === "document" ? "PDF" : "No photo"}</span>;
}

export default async function PostsPage() {
  const result = await load(listPosts);
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const posts = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Media</h1>
        <p className="admin-page__lede">Add an article, a video or a PDF. Published items appear on the Media page of the site.</p>
      </header>

      <section className="media-choices" aria-labelledby="media-choices-title">
        <h2 id="media-choices-title" className="admin-section__title">
          Add something new
        </h2>
        <ul className="media-choices__list">
          {postKinds.map((kind) => (
            <li key={kind} className="media-choices__item">
              <h3 className="media-choices__name">{kindLabels[kind].name}</h3>
              <p className="media-choices__about">{kindLabels[kind].about}</p>
              <Link href={`/admin/posts/new/${kind}/`} className="button button--primary">
                {kindLabels[kind].add}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="media-list-title">
        <h2 id="media-list-title" className="admin-section__title">
          Everything so far
        </h2>
        {posts.length === 0 ? (
          <p className="admin-empty">Nothing has been added yet.</p>
        ) : (
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.id} className="post-list__item">
                <Thumbnail post={post} />
                <div className="post-list__body">
                  <span className="post-list__kind">{kindLabels[post.kind].name}</span>
                  <Link href={`/admin/posts/${post.id}/`} className="admin-table__name">
                    {post.title}
                  </Link>
                </div>
                <span className={`status-badge ${post.status === "published" ? "status-badge--live" : "status-badge--draft"}`}>
                  {post.status === "published" ? "On the site" : "Draft"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
