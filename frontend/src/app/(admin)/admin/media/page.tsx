import type { Metadata } from "next";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { MediaCard } from "@/components/admin/MediaCard";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { VideoLinkForm } from "@/components/admin/VideoLinkForm";
import { listMedia } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage() {
  const result = await load(() => listMedia());
  if ("error" in result) return <ApiErrorState error={result.error} />;
  const media = result.data;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Media</h1>
        <p className="admin-page__lede">Photos and video links used on the public site.</p>
      </header>

      <div className="media-add">
        <PhotoUploader />
        <VideoLinkForm />
      </div>

      <section aria-labelledby="library-title">
        <h2 id="library-title" className="admin-section__title">
          Library
        </h2>
        {media.length === 0 ? (
          <p className="admin-empty">The library is empty. Upload a photo or add a video link above.</p>
        ) : (
          <ul className="media-library">
            {media.map((item) => (
              <MediaCard key={item.id} media={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
