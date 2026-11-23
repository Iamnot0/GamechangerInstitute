import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export const dynamic = "force-static";

const routes = ["/", "/programme/", "/organisations/", "/institute/", "/register/", "/privacy/"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: new URL(route, site.url).toString(),
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
