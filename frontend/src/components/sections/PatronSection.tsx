import { Photo } from "@/components/ui/Photo";
import type { SiteContent } from "@/lib/site-content";

export function PatronSection({ patron }: { patron: SiteContent["patron"] }) {
  return (
    <section className="patron" aria-label="Patron">
      <figure className="patron__inner">
        <Photo photo={patron.photo} className="patron__photo" />
        <div className="patron__copy">
          <blockquote className="patron__quote">
            <p>{patron.quote}</p>
          </blockquote>
          <figcaption className="patron__cite">
            {patron.name}
            <span>{patron.role}</span>
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
