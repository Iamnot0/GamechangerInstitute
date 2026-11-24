import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostView } from "@/components/media/PostView";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/metadata";
import { getPost, getPosts, paragraphs } from "@/lib/news";
import { article, video } from "@/lib/structured-data";

type PostPageProps = PageProps<"/news/[slug]">;

export const revalidate = 300;

/** Posts are written after the build, so each page is rendered on its first visit and then cached. */
export const generateStaticParams = () => [];

const relatedArticles = 5;

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Not found" };
  const lead = paragraphs(post.body)[0] ?? `${post.title}, from GameChanger Institute media.`;
  return pageMetadata({ title: post.title, description: lead.slice(0, 155), path: `/news/${post.slug}/` });
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const others =
    post.kind === "article"
      ? (await getPosts()).filter((other) => other.kind === "article" && other.slug !== post.slug).slice(0, relatedArticles)
      : [];

  return (
    <>
      <PostView post={post} otherArticles={others} />
      {post.kind === "article" ? <JsonLd data={article(post)} /> : null}
      {post.kind === "video" ? <JsonLd data={video(post)} /> : null}
    </>
  );
}
