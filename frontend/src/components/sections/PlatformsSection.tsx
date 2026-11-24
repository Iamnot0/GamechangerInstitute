import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { appliedAi } from "@/content/institute";
import type { SiteContent } from "@/lib/site-content";

export function PlatformsSection({ platforms }: { platforms: SiteContent["platforms"] }) {
  return (
    <section className="platforms" aria-labelledby="platforms-title">
      <div className="platforms__inner">
        <SectionHeading
          id="platforms-title"
          title="Where the Institute convenes"
          lede="The programme draws on the network GCI has built across boardrooms, stages and partnerships."
          align="split"
        />

        <ul className="platforms__list">
          {platforms.items.map((platform) => (
            <li key={platform.name} className="platforms__item">
              <Photo photo={platform.photo} className="platforms__photo" />
              <h3 className="platforms__name">{platform.name}</h3>
              <p className="platforms__body">{platform.body}</p>
            </li>
          ))}
        </ul>

        <article className="platforms__ai">
          <h3 className="platforms__ai-title">{appliedAi.title}</h3>
          <p>{appliedAi.body}</p>
        </article>
      </div>
    </section>
  );
}
