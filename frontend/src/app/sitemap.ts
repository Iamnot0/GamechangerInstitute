import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getPosts } from "@/lib/site-content";

/** Date each page's content last changed. Update the entry when the page's copy changes. */
const routes = {
  "/": "2026-11-24",
  "/programme/": "2026-11-24",
  "/organisations/": "2026-11-24",
  "/institute/": "2026-11-24",
  "/register/": "2026-11-24",
  "/news/": "2026-11-24",
  "/privacy/": "2026-11-23",
} as const;

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  return [
    ...Object.entries(routes).map(([route, lastModified]) => ({
      url: new URL(route, site.url).toString(),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: route === "/" ? 1 : 0.7,
    })),
    ...posts.map((post) => ({
      url: new URL(`/news/${post.slug}/`, site.url).toString(),
      lastModified: post.published_at,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
