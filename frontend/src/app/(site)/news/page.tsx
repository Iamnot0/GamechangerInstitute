import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageIntro } from "@/components/ui/PageIntro";
import { Photo } from "@/components/ui/Photo";
import { formatDay } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getPosts } from "@/lib/site-content";
import { breadcrumb } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "News and events",
  description:
    "Roundtables, keynotes and cohort milestones from GameChanger Institute and the ARISE Leadership Transformation Programme Series.",
  path: "/news/",
});

export default async function NewsPage() {
  const posts = await getPosts();

  return (
    <>
      <PageIntro
        context="GameChanger Institute"
        title="News and events"
        lede="Roundtables, keynotes and cohort milestones."
      />
      <section className="news" aria-label="Posts">
        <div className="news__inner">
          {posts.length === 0 ? (
            <p className="news__empty">Nothing has been posted yet. New roundtables, keynotes and cohort milestones will appear here.</p>
          ) : (
            <ul className="news__list">
              {posts.map((post) => (
                <li key={post.slug} className="news__item">
                  {post.cover ? <Photo photo={post.cover} className="news__cover" /> : null}
                  <p className="news__date">{formatDay(post.event_date ?? post.published_at)}</p>
                  <h2 className="news__title">
                    <Link href={`/news/${post.slug}/`}>{post.title}</Link>
                  </h2>
                  <p className="news__summary">{post.summary}</p>
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
