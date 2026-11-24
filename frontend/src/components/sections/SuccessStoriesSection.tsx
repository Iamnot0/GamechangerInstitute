import Image from "next/image";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { successStories } from "@/content/outcomes";
import type { SiteContent } from "@/lib/site-content";

type SuccessStoriesSectionProps = { stories: SiteContent["success_stories"]; logos: SiteContent["client_logos"] };

export function SuccessStoriesSection({ stories, logos }: SuccessStoriesSectionProps) {
  return (
    <section className="success" aria-labelledby="success-title">
      <div className="success__inner">
        <SectionHeading id="success-title" title={successStories.title} lede={stories.lede} align="split" />

        <div className="success__gallery">
          {stories.photos.map((photo) => (
            <Photo key={photo.src} photo={photo} className="success__photo" />
          ))}
        </div>

        <div className="success__outcomes">
          <h3 className="success__outcomes-title">Proven outcomes with</h3>
          <ul className="success__clients">
            {logos.clients.map((client) => (
              <li key={client.name} className="success__client">
                <Image
                  src={client.src}
                  width={client.width}
                  height={client.height}
                  alt={client.name}
                  className="success__logo"
                />
              </li>
            ))}
          </ul>
        </div>

        <p className="success__note">{successStories.note}</p>
      </div>
    </section>
  );
}
