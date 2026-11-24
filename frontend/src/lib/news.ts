import "server-only";
import type { Photo } from "@/content/institute";

export type Post = {
  slug: string;
  title: string;
  body: string;
  event_date: string | null;
  published_at: string;
  youtube_id: string | null;
  photos: Photo[];
  document: { url: string; name: string; size_bytes: number } | null;
};

export const postsTag = "posts";

// At runtime the service binding answers. During a build it does not exist yet, so the
// deployment already in production answers instead and the build ships current posts.
const apiBases = [
  process.env.BACKEND_INTERNAL_URL,
  process.env.ADMIN_API_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api` : undefined,
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined,
].filter((base): base is string => Boolean(base));

async function read<T>(path: string): Promise<T | null> {
  for (const base of apiBases) {
    try {
      const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        next: { tags: [postsTag], revalidate: 300 },
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

/** Published posts, newest first. An unreachable service reads as no posts, never as an error page. */
export async function getPosts(): Promise<Post[]> {
  const body = await read<{ items?: Post[] }>("/v1/posts?limit=50");
  return Array.isArray(body?.items) ? body.items : [];
}

export function getPost(slug: string): Promise<Post | null> {
  return read<Post>(`/v1/posts/${encodeURIComponent(slug)}`);
}

export const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
