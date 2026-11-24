"use client";

import Image from "next/image";
import { useState } from "react";

type VideoEmbedProps = { youtubeId: string; title: string };

/** Shows the video's still until it is asked for, so YouTube loads nothing and sets no cookies before a click. */
export function VideoEmbed({ youtubeId, title }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="video-embed">
        <iframe
          className="video-embed__frame"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button type="button" className="video-embed video-embed--still" onClick={() => setPlaying(true)}>
      <Image src={`https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`} width={480} height={360} alt="" className="video-embed__still" />
      <span className="video-embed__play">Play video: {title}</span>
    </button>
  );
}
