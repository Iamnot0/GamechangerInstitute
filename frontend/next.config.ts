import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const crossOriginApi = apiUrl && /^https?:\/\//.test(apiUrl) ? ` ${new URL(apiUrl).origin}` : "";

// Clerk runs only on the staff console and its sign-in page, so only those paths allow its origins.
const clerkOrigins = "https://*.clerk.accounts.dev https://*.clerk.com";
const clerkChallenge = "https://challenges.cloudflare.com";

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

const siteCsp = contentSecurityPolicy();
const staffCsp = contentSecurityPolicy({
  script: ` ${clerkOrigins} ${clerkChallenge}`,
  connect: ` ${clerkOrigins} https://clerk-telemetry.com`,
  img: " https://img.clerk.com",
  frame: clerkChallenge,
  worker: " blob:",
});

const nextConfig: NextConfig = {
  trailingSlash: true,
  agentRules: false,
  poweredByHeader: false,
  images: { unoptimized: true },
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
