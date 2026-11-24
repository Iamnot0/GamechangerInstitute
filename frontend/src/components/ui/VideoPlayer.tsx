type VideoPlayerProps = { src: string; poster?: string; title: string };

/** An uploaded video. Nothing but the still is fetched until the visitor presses play. */
export function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  return <video className="video-player" src={src} poster={poster} controls playsInline preload="none" aria-label={title} />;
}
