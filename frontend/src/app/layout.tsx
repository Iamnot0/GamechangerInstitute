import type { Metadata, Viewport } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { site } from "@/content/site";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const text = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `ARISE Leadership Transformation Programme Series · ${site.name}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_SG",
    url: "/",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1512" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-SG" className={`${display.variable} ${text.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
