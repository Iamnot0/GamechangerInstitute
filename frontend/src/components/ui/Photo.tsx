import Image from "next/image";
import type { Photo as PhotoData } from "@/content/institute";

type PhotoProps = {
  photo: PhotoData;
  className?: string;
  priority?: boolean;
};

export function Photo({ photo, className, priority = false }: PhotoProps) {
  return (
    <Image
      src={photo.src}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
