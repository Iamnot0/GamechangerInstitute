/**
 * Hero footage: Dr Benjamin Mah, Guest of Honour address, Curtin Singapore 2025, from his own
 * YouTube channel (QLlWlYdR3Kc). Cut to a seamless loop, without audio or lectern branding.
 * Browsers take the first source they can play: 720p on phones, AV1 elsewhere, H.264 as fallback.
 */
export const heroVideo = {
  poster: "/media/hero-speech-poster.webp",
  sources: [
    { src: "/media/hero-speech-720.mp4", type: "video/mp4", media: "(max-width: 767px)" },
    { src: "/media/hero-speech-1080.av1.mp4", type: 'video/mp4; codecs="av01.0.08M.10"', media: undefined },
    { src: "/media/hero-speech-1080.mp4", type: "video/mp4", media: undefined },
  ],
} as const;
