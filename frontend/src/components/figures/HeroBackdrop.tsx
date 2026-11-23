"use client";

import { useEffect, useRef, useState } from "react";
import { heroVideo } from "@/content/media";

type Connection = { saveData?: boolean };

export function HeroBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: Connection }).connection?.saveData === true;
    if (reducedMotion || saveData) return;
    video.play().catch(() => {
      // Autoplay refused by the browser; the poster stays and the control offers playback.
    });
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {heroVideo.sources.map((source) => (
          <source key={source.src} src={source.src} type="video/mp4" media={source.media} />
        ))}
      </video>
      <div className="hero-backdrop__scrim" />
      <button type="button" className="hero-backdrop__control" onClick={toggle} aria-pressed={!playing}>
        {playing ? "Pause background video" : "Play background video"}
      </button>
    </div>
  );
}
