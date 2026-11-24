import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { DeletePostButton } from "@/components/admin/DeletePostButton";
import { listPosts } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";
import { postKinds, type AdminPost, type PostKind } from "@/lib/admin-types";
import { formatDay } from "@/lib/format";
import { kindLabels } from "@/lib/media-kinds";

export const metadata: Metadata = { title: "Media" };

const isKind = (value: unknown): value is PostKind => postKinds.some((kind) => kind === value);

function Thumbnail({ post }: { post: AdminPost }) {
  const photo = post.photos[0];
  if (photo) return <Image src={photo.src} width={photo.width} height={photo.height} alt="" className="post-list__thumb" />;
  if (post.youtube_id) {
    return <Image src={`https://i.ytimg.com/vi/${post.youtube_id}/hqdefault.jpg`} width={480} height={360} alt="" className="post-list__thumb" />;
  }
  return <span className="post-list__thumb post-list__thumb--none">{post.kind === "document" ? "PDF" : "No photo"}</span>;
}

export default async function PostsPage({ searchParams }: PageProps<"/admin/posts">) {
  const { kind } = await searchParams;
  const shown = isKind(kind) ? kind : undefined;
  const result = await load(listPosts);
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const posts = result.data;
  const listed = shown ? posts.filter((post) => post.kind === shown) : posts;
  const filters = [
    { label: "All", kind: undefined, count: posts.length },
    ...postKinds.map((each) => ({ label: kindLabels[each].plural, kind: each, count: posts.filter((post) => post.kind === each).length })),
  ];

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
          {postKinds.map((each) => (
            <li key={each} className="media-choices__item">
              <h3 className="media-choices__name">{kindLabels[each].name}</h3>
              <p className="media-choices__about">{kindLabels[each].about}</p>
              <Link href={`/admin/posts/new/${each}/`} className="button button--primary">
                {kindLabels[each].add}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="media-list-title">
        <h2 id="media-list-title" className="admin-section__title">
          Everything so far
        </h2>
        <nav className="status-tabs media-list__filter" aria-label="Filter by kind">
          <ul className="status-tabs__list">
            {filters.map((filter) => (
              <li key={filter.label}>
                <Link
                  href={filter.kind ? `/admin/posts/?kind=${filter.kind}` : "/admin/posts/"}
                  className="status-tabs__tab"
                  aria-current={filter.kind === shown ? "page" : undefined}
                >
                  {filter.label}
                  <span className="status-tabs__count">{filter.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {listed.length === 0 ? (
          <p className="admin-empty">
            {shown ? `No ${kindLabels[shown].plural.toLowerCase()} yet. Use the buttons above to add one.` : "Nothing has been added yet. Use the buttons above to add the first item."}
          </p>
        ) : (
          <ul className="post-list">
            {listed.map((post) => (
              <li key={post.id} className="post-list__item">
                <Thumbnail post={post} />
                <div className="post-list__body">
                  <span className="post-list__kind">{kindLabels[post.kind].name}</span>
                  <Link href={`/admin/posts/${post.id}/`} className="admin-table__name">
                    {post.title}
                  </Link>
                  <span className="post-list__when">Last changed {formatDay(post.updated_at)}</span>
                </div>
                <span className={`status-badge ${post.status === "published" ? "status-badge--live" : "status-badge--draft"}`}>
                  {post.status === "published" ? "On the site" : "Draft"}
                </span>
                <div className="post-list__tools">
                  <Link href={`/admin/posts/${post.id}/`} className="text-button">
                    Edit<span className="visually-hidden"> {post.title}</span>
                  </Link>
                  <Link href={`/admin/posts/${post.id}/preview/`} className="text-button">
                    Preview<span className="visually-hidden"> {post.title}</span>
                  </Link>
                  <DeletePostButton postId={post.id} title={post.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
