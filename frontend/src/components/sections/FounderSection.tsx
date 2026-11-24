import { Photo } from "@/components/ui/Photo";
import type { SiteContent } from "@/lib/site-content";

export function FounderSection({ founder }: { founder: SiteContent["founder"] }) {
  return (
    <section className="founder" aria-labelledby="founder-title">
      <div className="founder__inner">
        <figure className="founder__figure">
          <Photo photo={founder.portrait} className="founder__photo" priority />
        </figure>
        <div className="founder__copy">
          <h2 id="founder-title" className="founder__name">
            {founder.name} <span>({founder.short_name})</span>
          </h2>
          <p className="founder__title">{founder.title}</p>
          <p className="founder__role">{founder.role}</p>
          <p className="founder__feature">{founder.feature}</p>
        </div>
      </div>
    </section>
  );
}
