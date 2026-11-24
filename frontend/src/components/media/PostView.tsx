import Link from "next/link";
import { ArticleView } from "@/components/media/ArticleView";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { formatDay, megabytes } from "@/lib/format";
import { paragraphs, type Post, type PostKind } from "@/lib/news";

type PostViewProps = { post: Post; otherArticles: Post[] };

const kindNames: Record<PostKind, string> = { article: "Article", video: "Video", document: "Document" };

/** One item from Media as readers see it. The staff preview draws the same thing from an unpublished post. */
export function PostView({ post, otherArticles }: PostViewProps) {
  if (post.kind === "article") return <ArticleView post={post} others={otherArticles} />;

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
        {post.youtube_id ? <VideoEmbed youtubeId={post.youtube_id} title={post.title} /> : null}
        {post.video_url ? <VideoPlayer src={post.video_url} poster={post.photos[0]?.src} title={post.title} /> : null}
        {post.body ? (
          <div className="post__body">
            {paragraphs(post.body).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        {post.document ? (
          <p className="post__document">
            <a href={post.document.url} className="button button--secondary" target="_blank" rel="noreferrer">
              Download: {post.document.name}
            </a>
            <span>PDF, {megabytes(post.document.size_bytes)}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
