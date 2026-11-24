import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { Photo } from "@/components/ui/Photo";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { formatDay } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getPost } from "@/lib/site-content";
import { article } from "@/lib/structured-data";

type PostPageProps = PageProps<"/news/[slug]">;

/** Posts are written after the build, so each page is rendered on its first visit and then cached. */
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Post not found" };
  return pageMetadata({ title: post.title, description: post.summary, path: `/news/${post.slug}/` });
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const paragraphs = post.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

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
        <p className="post__summary">{post.summary}</p>
        {post.cover ? <Photo photo={post.cover} className="post__cover" priority /> : null}
        <div className="post__body">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {post.video ? <VideoEmbed youtubeId={post.video.youtube_id} title={post.video.title} /> : null}
      </div>
      <JsonLd data={article(post)} />
    </article>
  );
}
