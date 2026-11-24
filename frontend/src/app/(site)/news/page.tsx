import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageIntro } from "@/components/ui/PageIntro";
import { Photo } from "@/components/ui/Photo";
import { formatDay } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getPosts, paragraphs, type Post } from "@/lib/news";
import { breadcrumb } from "@/lib/structured-data";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "News and events",
  description:
    "Roundtables, keynotes and cohort milestones from GameChanger Institute and the ARISE Leadership Transformation Programme Series.",
  path: "/news/",
});

function Cover({ post }: { post: Post }) {
  if (post.photos[0]) return <Photo photo={post.photos[0]} className="news__cover" />;
  if (!post.youtube_id) return null;
  return <Image src={`https://i.ytimg.com/vi/${post.youtube_id}/hqdefault.jpg`} width={480} height={360} alt="" className="news__cover" />;
}

const excerpt = (body: string) => {
  const first = paragraphs(body)[0] ?? "";
  return first.length > 180 ? `${first.slice(0, 177).trimEnd()}…` : first;
};

export default async function NewsPage() {
  const posts = await getPosts();

  return (
    <>
      <PageIntro context="GameChanger Institute" title="News and events" />
      <section className="news" aria-label="Posts">
        <div className="news__inner">
          {posts.length === 0 ? (
            <p className="news__empty">Coming Soon</p>
          ) : (
            <ul className="news__list">
              {posts.map((post) => (
                <li key={post.slug} className="news__item">
                  <Cover post={post} />
                  <p className="news__date">{formatDay(post.event_date ?? post.published_at)}</p>
                  <h2 className="news__title">
                    <Link href={`/news/${post.slug}/`}>{post.title}</Link>
                  </h2>
                  {post.body ? <p className="news__summary">{excerpt(post.body)}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <JsonLd data={breadcrumb("News and events", "/news/")} />
    </>
  );
}
