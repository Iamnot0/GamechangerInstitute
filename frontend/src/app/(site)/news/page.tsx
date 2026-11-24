import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageIntro } from "@/components/ui/PageIntro";
import { Photo } from "@/components/ui/Photo";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { formatDay, megabytes } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getPosts, paragraphs, type Post } from "@/lib/news";
import { breadcrumb } from "@/lib/structured-data";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Media",
  description: "Articles, videos and documents from GameChanger Institute and the ARISE Leadership Transformation Programme Series.",
  path: "/news/",
});

const excerpt = (body: string) => {
  const first = paragraphs(body)[0] ?? "";
  return first.length > 180 ? `${first.slice(0, 177).trimEnd()}…` : first;
};

function Article({ post }: { post: Post }) {
  return (
    <li className="news__item">
      {post.photos[0] ? <Photo photo={post.photos[0]} className="news__cover" /> : null}
      <p className="news__date">{formatDay(post.event_date ?? post.published_at)}</p>
      <h3 className="news__title">
        <Link href={`/news/${post.slug}/`}>{post.title}</Link>
      </h3>
      <p className="news__summary">{excerpt(post.body)}</p>
    </li>
  );
}

function Video({ post }: { post: Post }) {
  return (
    <li className="news__item">
      {post.youtube_id ? <VideoEmbed youtubeId={post.youtube_id} title={post.title} /> : null}
      {post.video_url ? <VideoPlayer src={post.video_url} poster={post.photos[0]?.src} title={post.title} /> : null}
      <p className="news__date">{formatDay(post.published_at)}</p>
      <h3 className="news__title">
        <Link href={`/news/${post.slug}/`}>{post.title}</Link>
      </h3>
    </li>
  );
}

function Document({ post }: { post: Post }) {
  if (!post.document) return null;
  return (
    <li className="documents__item">
      <Image src="/images/document-mark.svg" width={64} height={64} alt="" className="documents__mark" />
      <div className="documents__body">
        <h3 className="documents__title">
          <Link href={`/news/${post.slug}/`}>{post.title}</Link>
        </h3>
        <p className="documents__meta">
          {post.body ? `${post.body} · ` : ""}PDF, {megabytes(post.document.size_bytes)}
        </p>
      </div>
      <a href={post.document.url} className="button button--secondary" target="_blank" rel="noreferrer">
        Download<span className="visually-hidden"> {post.title}</span>
      </a>
    </li>
  );
}

export default async function NewsPage() {
  const posts = await getPosts();
  const sections = [
    { id: "articles", title: "Articles", posts: posts.filter((post) => post.kind === "article") },
    { id: "videos", title: "Videos", posts: posts.filter((post) => post.kind === "video") },
    { id: "documents", title: "Documents", posts: posts.filter((post) => post.kind === "document") },
  ].filter((section) => section.posts.length > 0);

  return (
    <>
      <PageIntro context="GameChanger Institute" title="Media" />
      <div className="news">
        <div className="news__inner">
          {sections.length === 0 ? <p className="news__empty">Coming Soon</p> : null}
          {sections.length > 1 ? (
            <nav className="media-nav" aria-label="Kinds of media">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="media-nav__link">
                  {section.title}
                </a>
              ))}
            </nav>
          ) : null}
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="media-section" aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="media-section__title">
                {section.title}
              </h2>
              {section.id === "documents" ? (
                <ul className="documents">
                  {section.posts.map((post) => (
                    <Document key={post.slug} post={post} />
                  ))}
                </ul>
              ) : (
                <ul className="news__list">
                  {section.posts.map((post) => (section.id === "videos" ? <Video key={post.slug} post={post} /> : <Article key={post.slug} post={post} />))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
      <JsonLd data={breadcrumb("Media", "/news/")} />
    </>
  );
}
