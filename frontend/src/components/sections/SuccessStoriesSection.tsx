import Image from "next/image";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { successStories } from "@/content/outcomes";

export function SuccessStoriesSection() {
  return (
    <section className="success" aria-labelledby="success-title">
      <div className="success__inner">
        <SectionHeading id="success-title" title={successStories.title} lede={successStories.lede} align="split" />

        <div className="success__gallery">
          {successStories.photos.map((photo) => (
            <Photo key={photo.src} photo={photo} className="success__photo" />
          ))}
        </div>

        <div className="success__outcomes">
          <h3 className="success__outcomes-title">Proven outcomes with</h3>
          <ul className="success__clients">
            {successStories.clients.map((client) => (
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
