import Image from "next/image";
import type { Media } from "@/lib/admin-types";

export function MediaThumb({ media, className }: { media: Media; className?: string }) {
  if (media.kind === "video") {
    return (
      <Image
        src={`https://i.ytimg.com/vi/${media.youtube_id}/hqdefault.jpg`}
        width={480}
        height={360}
        alt=""
        className={className}
      />
    );
  }
  return <Image src={media.url} width={media.width ?? 640} height={media.height ?? 480} alt={media.alt} className={className} />;
}
