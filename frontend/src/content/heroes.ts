import type { Photo } from "@/content/institute";

/** A page's opening photo, with a half-size copy that phones load instead. */
export type HeroPhoto = Photo & { compactSrc: string };

/** The photo each page opens on. Sources and licences are in documents/ASSETS.md. */
export const heroPhotos = {
  programme: {
    src: "/images/hero-lecture-hall-2400.webp",
    compactSrc: "/images/hero-lecture-hall-1200.webp",
    width: 2400,
    height: 1601,
    alt: "Rows of wooden seats in an empty lecture hall.",
  },
  organisations: {
    src: "/images/hero-boardroom-2400.webp",
    compactSrc: "/images/hero-boardroom-1200.webp",
    width: 2400,
    height: 1091,
    alt: "A long table and chairs in a quiet meeting room, lit from a tall window.",
  },
  institute: {
    src: "/images/hero-colonnade-2400.webp",
    compactSrc: "/images/hero-colonnade-1200.webp",
    width: 2400,
    height: 1670,
    alt: "A long colonnade of pale stone columns along the front of a school building.",
  },
  media: {
    src: "/images/hero-hall-2400.webp",
    compactSrc: "/images/hero-hall-1200.webp",
    width: 2400,
    height: 1597,
    alt: "A hall with painted arches above a row of meeting tables.",
  },
} satisfies Record<string, HeroPhoto>;
