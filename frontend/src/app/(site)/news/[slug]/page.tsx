import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { Photo } from "@/components/ui/Photo";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { formatDay, megabytes } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getPost, paragraphs, type Post, type PostKind } from "@/lib/news";
import { article, video } from "@/lib/structured-data";

type PostPageProps = PageProps<"/news/[slug]">;

export const revalidate = 300;

/** Posts are written after the build, so each page is rendered on its first visit and then cached. */
export const generateStaticParams = () => [];

const kindNames: Record<PostKind, string> = { article: "Article", video: "Video", document: "Document" };

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Not found" };
  const lead = paragraphs(post.body)[0] ?? `${post.title}, from GameChanger Institute media.`;
  return pageMetadata({ title: post.title, description: lead.slice(0, 155), path: `/news/${post.slug}/` });
}

function Download({ post }: { post: Post }) {
  if (!post.document) return null;
  return (
    <p className="post__document">
      <a href={post.document.url} className="button button--secondary" target="_blank" rel="noreferrer">
        Download: {post.document.name}
      </a>
      <span>PDF, {megabytes(post.document.size_bytes)}</span>
    </p>
  );
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const isArticle = post.kind === "article";
  const [cover, ...gallery] = isArticle ? post.photos : [];

  return (
    <article className="post" aria-labelledby="page-title">
      <div className="post__inner">
        <Link href="/news/" className="post__back">
          Media
        </Link>
        <p className="post__date">
          {kindNames[post.kind]} · {formatDay(post.event_date ?? post.published_at)}
        </p>
        <h1 id="page-title" className="post__title">
          {post.title}
        </h1>
        {cover ? <Photo photo={cover} className="post__cover" priority /> : null}
        {post.youtube_id ? <VideoEmbed youtubeId={post.youtube_id} title={post.title} /> : null}
        {post.video_url ? <VideoPlayer src={post.video_url} poster={post.photos[0]?.src} title={post.title} /> : null}
        {post.body ? (
          <div className="post__body">
            {paragraphs(post.body).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        <Download post={post} />
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
      {isArticle ? <JsonLd data={article(post)} /> : null}
      {post.kind === "video" ? <JsonLd data={video(post)} /> : null}
    </article>
  );
}
