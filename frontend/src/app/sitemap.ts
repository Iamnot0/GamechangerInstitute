import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export const dynamic = "force-static";

/** Date each page's content last changed. Update the entry when the page's copy changes. */
const routes = {
  "/": "2026-11-24",
  "/programme/": "2026-11-24",
  "/organisations/": "2026-11-24",
  "/institute/": "2026-11-24",
  "/register/": "2026-11-24",
  "/privacy/": "2026-11-23",
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.entries(routes).map(([route, lastModified]) => ({
    url: new URL(route, site.url).toString(),
    lastModified,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
