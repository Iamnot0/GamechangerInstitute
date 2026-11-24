import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const crossOriginApi = apiUrl && /^https?:\/\//.test(apiUrl) ? ` ${new URL(apiUrl).origin}` : "";

// Photos uploaded from the staff console live on this project's own storage host and no other;
// without MEDIA_HOST no storage host is trusted. The stills of linked YouTube videos come from ytimg.
const mediaHost = process.env.MEDIA_HOST?.trim() || null;
if (mediaHost && !/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(mediaHost)) {
  throw new Error("MEDIA_HOST must be this project's Blob store host, such as abc123.public.blob.vercel-storage.com");
}
const mediaOrigins = `${mediaHost ? `https://${mediaHost} ` : ""}https://i.ytimg.com`;

type Csp = { script?: string; connect?: string; img?: string; frame?: string; worker?: string };

// Pages are prerendered and cannot carry per-request nonces, so inline scripts are allowed
// (Next's runtime payload and the theme script). Everything else is same-origin unless listed.
function contentSecurityPolicy(extra: Csp = {}): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${extra.script ?? ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${extra.img ?? ""}`,
    "media-src 'self'",
    "font-src 'self'",
    `connect-src 'self'${crossOriginApi}${isDev ? " ws:" : ""}${extra.connect ?? ""}`,
    `frame-src ${extra.frame ?? "'none'"}`,
    `worker-src 'self'${extra.worker ?? ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const baseHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const siteCsp = contentSecurityPolicy({ img: ` ${mediaOrigins}`, frame: "https://www.youtube-nocookie.com" });
// vercel.com receives photo and PDF uploads straight from the browser on the staff console.
const staffCsp = contentSecurityPolicy({
  connect: " https://vercel.com",
  img: ` ${mediaOrigins}`,
});

const nextConfig: NextConfig = {
  trailingSlash: true,
  agentRules: false,
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      ...(mediaHost ? [{ protocol: "https" as const, hostname: mediaHost }] : []),
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async headers() {
    // Later entries override earlier ones for the same header key, so staff paths replace the site CSP.
    const staffPaths = ["/admin/:path*", "/sign-in/:path*"];
    return [
      { source: "/:path*", headers: [...baseHeaders, { key: "Content-Security-Policy", value: siteCsp }] },
      ...staffPaths.map((source) => ({
        source,
        headers: [
          { key: "Content-Security-Policy", value: staffCsp },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      })),
    ];
  },
  turbopack: {
    rules: {
      // Tailwind compiles project CSS only. Without the "foreign" exclusion it also
      // rewrites Next's generated next/font CSS and breaks the font URLs.
      "*.css": {
        condition: { not: "foreign" },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
