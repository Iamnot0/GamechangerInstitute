import "server-only";
import { founder, patron, platforms, stewards, type Photo } from "@/content/institute";
import { successStories } from "@/content/outcomes";

export type ClientLogo = { name: string; src: string; width: number; height: number };

export type SiteContent = {
  success_stories: { lede: string; photos: Photo[] };
  client_logos: { clients: ClientLogo[] };
  founder: { name: string; short_name: string; title: string; role: string; feature: string; portrait: Photo };
  stewards: { title: string; body: string };
  platforms: { items: { name: string; body: string; photo: Photo }[] };
  patron: { name: string; role: string; quote: string; photo: Photo };
};

export type BlockKey = keyof SiteContent;

export type Post = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  event_date: string | null;
  published_at: string;
  cover: Photo | null;
  video: { youtube_id: string; title: string } | null;
};

export const contentTag = "content";
export const postsTag = "posts";

/** What the site shows when the content service cannot be reached. */
const shipped: SiteContent = {
  success_stories: { lede: successStories.lede, photos: [...successStories.photos] },
  client_logos: { clients: [...successStories.clients] },
  founder: {
    name: founder.name,
    short_name: founder.shortName,
    title: founder.title,
    role: founder.role,
    feature: founder.feature,
    portrait: founder.portrait,
  },
  stewards: { title: stewards.title, body: stewards.body },
  platforms: { items: [...platforms] },
  patron: { name: patron.name, role: patron.role, quote: patron.quote, photo: patron.photo },
};

// At runtime the service binding answers. During a build it does not exist yet, so the
// deployment already in production answers instead and the build ships current content.
const apiBases = [
  process.env.BACKEND_INTERNAL_URL,
  process.env.ADMIN_API_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api` : undefined,
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined,
].filter((base): base is string => Boolean(base));

async function read<T>(path: string, tag: string): Promise<T | null> {
  for (const base of apiBases) {
    try {
      const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        next: { tags: [tag], revalidate: 300 },
        signal: AbortSignal.timeout(4_000),
      });
      if (response.status === 404) return null;
      if (response.ok) return (await response.json()) as T;
    } catch {
      continue;
    }
  }
  return null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function getSiteContent(): Promise<SiteContent> {
  const body = await read<{ blocks?: unknown }>("/v1/content", contentTag);
  const published = isRecord(body?.blocks) ? body.blocks : {};
  const content = { ...shipped };
  for (const key of Object.keys(shipped) as BlockKey[]) {
    if (isRecord(published[key])) Object.assign(content, { [key]: published[key] });
  }
  return content;
}

export async function getPosts(): Promise<Post[]> {
  const body = await read<{ items?: Post[] }>("/v1/posts?limit=50", postsTag);
  return Array.isArray(body?.items) ? body.items : [];
}

export function getPost(slug: string): Promise<Post | null> {
  return read<Post>(`/v1/posts/${encodeURIComponent(slug)}`, postsTag);
}
