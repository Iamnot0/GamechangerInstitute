import Link from "next/link";
import { formatDay } from "@/lib/format";
import type { Post } from "@/lib/news";

type KeepReadingProps = { articles: Post[] };

export function KeepReading({ articles }: KeepReadingProps) {
  return (
    <section className="keep-reading" aria-labelledby="keep-reading-title">
      <h2 id="keep-reading-title" className="article-aside__title">
        Keep reading
      </h2>
      <ul className="keep-reading__list">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/news/${article.slug}/`} className="keep-reading__link">
              {article.title}
            </Link>
            <p className="keep-reading__date">{formatDay(article.event_date ?? article.published_at)}</p>
          </li>
        ))}
      </ul>
      <Link href="/news/#articles" className="keep-reading__all">
        All articles
      </Link>
    </section>
  );
}
