import type { Metadata } from "next";
import { programmeName, site } from "@/content/site";

type PageMetadata = {
  title: string | { absolute: string };
  description: string;
  path: `/${string}/`;
};

const shareImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: `${programmeName}, ${site.name}. From capacity to performance.`,
};

/** Share card for one address. A page that sets its own Open Graph block replaces the parent's
    whole block, so the image is restated here instead of being inherited. */
export function shareCard(path: "/" | `/${string}/`): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: site.name, locale: "en_SG", url: path, images: [shareImage] },
    twitter: { card: "summary_large_image", images: [shareImage] },
  };
}

/** Canonical and share address are set together so they can never disagree. */
export function pageMetadata({ title, description, path }: PageMetadata): Metadata {
  return { title, description, alternates: { canonical: path }, ...shareCard(path) };
}
