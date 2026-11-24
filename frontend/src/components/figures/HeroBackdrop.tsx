"use client";

import { useEffect, useRef } from "react";
import { heroVideo } from "@/content/media";

type Connection = { saveData?: boolean };

export function HeroBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: Connection }).connection?.saveData === true;
    if (reducedMotion || saveData) return;
    video.play().catch(() => {
      // Autoplay refused by the browser; the poster frame stays in place.
    });
  }, []);

  return (
    <div className="hero-backdrop">
      <video
        ref={videoRef}
        className="hero-backdrop__video"
        poster={heroVideo.poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        {heroVideo.sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} media={source.media} />
        ))}
      </video>
      <div className="hero-backdrop__scrim" />
    </div>
  );
}
