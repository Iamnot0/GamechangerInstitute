import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import type { SiteContent } from "@/lib/site-content";

type InstituteTeaserSectionProps = Pick<SiteContent, "founder" | "stewards" | "platforms">;

export function InstituteTeaserSection({ founder, stewards, platforms }: InstituteTeaserSectionProps) {
  return (
    <section className="institute-teaser" aria-labelledby="institute-teaser-title">
      <div className="institute-teaser__inner">
        <figure className="institute-teaser__figure">
          <Photo photo={founder.portrait} className="institute-teaser__photo" />
          <figcaption className="institute-teaser__caption">
            <strong>
              {founder.name} ({founder.short_name})
            </strong>
            {founder.title}
          </figcaption>
        </figure>

        <div className="institute-teaser__copy">
          <h2 id="institute-teaser-title" className="institute-teaser__title">
            {stewards.title}
          </h2>
          <p className="institute-teaser__body">{stewards.body}</p>
          <p className="institute-teaser__body">The Institute also convenes leaders through:</p>
          <ul className="institute-teaser__platforms">
            {platforms.items.map((platform) => (
              <li key={platform.name}>{platform.name}</li>
            ))}
          </ul>
          <Link href="/institute/" className="text-link">
            About the Institute
          </Link>
        </div>
      </div>
    </section>
  );
}
