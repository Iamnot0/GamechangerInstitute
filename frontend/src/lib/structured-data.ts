import { founder } from "@/content/institute";
import { programmeName, site } from "@/content/site";
import type { Post } from "@/lib/news";

const absolute = (path: string) => new URL(path, site.url).toString();
const organisationId = absolute("/#organisation");

export const organisationGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": organisationId,
      name: site.name,
      url: absolute("/"),
      logo: absolute("/apple-icon.png"),
      description: site.description,
      founder: { "@type": "Person", name: founder.name, jobTitle: founder.title },
    },
    {
      "@type": "WebSite",
      "@id": absolute("/#website"),
      name: site.name,
      url: absolute("/"),
      inLanguage: "en-SG",
      publisher: { "@id": organisationId },
    },
  ],
};

export const breadcrumb = (name: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absolute("/") },
    { "@type": "ListItem", position: 2, name, item: absolute(path) },
  ],
});

export const programmeCourse = (description: string) => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: programmeName,
  description,
  url: absolute("/programme/"),
  inLanguage: "en-SG",
  timeRequired: "P12W",
  provider: { "@id": organisationId },
});

export const article = (post: Post) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  datePublished: post.published_at,
  url: absolute(`/news/${post.slug}/`),
  ...(post.photos[0] ? { image: absolute(post.photos[0].src) } : {}),
  publisher: { "@id": organisationId },
});
