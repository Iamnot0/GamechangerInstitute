import Link from "next/link";
import { KeepReading } from "@/components/media/KeepReading";
import { ShareLinks } from "@/components/media/ShareLinks";
import { Photo } from "@/components/ui/Photo";
import { site } from "@/content/site";
import { formatDay, megabytes } from "@/lib/format";
import { paragraphs, type Post } from "@/lib/news";

type ArticleViewProps = { post: Post; others: Post[] };

const wordsPerMinute = 200;

/** A wide photo can fill the band with little lost. A square or tall one would lose most of itself,
    so it is shown whole over a blurred copy of itself. */
const fillsBand = (photo: { width: number; height: number }) => photo.width / photo.height >= 1.5;

const minutesToRead = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).length / wordsPerMinute));

export function ArticleView({ post, others }: ArticleViewProps) {
  const [cover, ...gallery] = post.photos;

  return (
    <article className="article" aria-labelledby="page-title">
      {cover ? (
        <div className={fillsBand(cover) ? "article__band" : "article__band article__band--fitted"}>
          {fillsBand(cover) ? null : <Photo photo={{ ...cover, alt: "" }} className="article__backdrop" />}
          <Photo photo={cover} className="article__cover" priority />
        </div>
      ) : null}
      <div className="article__inner">
        <div className="article__main">
          <Link href="/news/" className="post__back">
            Media
          </Link>
          <h1 id="page-title" className="article__title">
            {post.title}
          </h1>
          <p className="article__meta">
            <span>{site.name}</span>
            <span>{formatDay(post.event_date ?? post.published_at)}</span>
            <span>{minutesToRead(post.body)} min read</span>
          </p>
          <div className="article__body">
            {paragraphs(post.body).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {post.document ? (
            <p className="post__document">
              <a href={post.document.url} className="button button--secondary" target="_blank" rel="noreferrer">
                Download: {post.document.name}
              </a>
              <span>PDF, {megabytes(post.document.size_bytes)}</span>
            </p>
          ) : null}
          {gallery.length > 0 ? (
            <ul className="post__gallery">
              {gallery.map((photo) => (
                <li key={photo.src}>
                  <Photo photo={photo} className="post__photo" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <aside className="article__aside" aria-label="More from Media">
          {others.length > 0 ? <KeepReading articles={others} /> : null}
          <ShareLinks url={new URL(`/news/${post.slug}/`, site.url).toString()} title={post.title} />
        </aside>
      </div>
    </article>
  );
}
