/**
 * Hero footage: "Colleagues having a meeting at the conference room" by MART PRODUCTION,
 * Pexels video 7644023, used under the Pexels licence. Re-encoded without audio.
 */
export const heroVideo = {
  poster: "/media/hero-boardroom-poster.webp",
  sources: [
    { src: "/media/hero-boardroom-768.mp4", media: "(max-width: 767px)" },
    { src: "/media/hero-boardroom-1280.mp4", media: undefined },
  ],
} as const;
