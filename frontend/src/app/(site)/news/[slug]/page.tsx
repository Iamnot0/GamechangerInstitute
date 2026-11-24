import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { Photo } from "@/components/ui/Photo";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { formatDay } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getPost, paragraphs } from "@/lib/news";
import { article } from "@/lib/structured-data";

type PostPageProps = PageProps<"/news/[slug]">;

export const revalidate = 300;

/** Posts are written after the build, so each page is rendered on its first visit and then cached. */
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Post not found" };
  const lead = paragraphs(post.body)[0] ?? `${post.title}, from GameChanger Institute news and events.`;
  return pageMetadata({ title: post.title, description: lead.slice(0, 155), path: `/news/${post.slug}/` });
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const [cover, ...gallery] = post.photos;

  return (
    <article className="post" aria-labelledby="page-title">
      <div className="post__inner">
        <Link href="/news/" className="post__back">
          News and events
        </Link>
        <p className="post__date">{formatDay(post.event_date ?? post.published_at)}</p>
        <h1 id="page-title" className="post__title">
          {post.title}
        </h1>
        {cover ? <Photo photo={cover} className="post__cover" priority /> : null}
        <div className="post__body">
          {paragraphs(post.body).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {post.youtube_id ? <VideoEmbed youtubeId={post.youtube_id} title={post.title} /> : null}
        {post.document ? (
          <p className="post__document">
            <a href={post.document.url} className="button button--secondary" target="_blank" rel="noreferrer">
              Download: {post.document.name}
            </a>
            <span>PDF, {(post.document.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
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
      <JsonLd data={article(post)} />
    </article>
  );
}
