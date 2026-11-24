import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { founder, platforms, stewards } from "@/content/institute";

export function InstituteTeaserSection() {
  return (
    <section className="institute-teaser" aria-labelledby="institute-teaser-title">
      <div className="institute-teaser__inner">
        <figure className="institute-teaser__figure">
          <Photo photo={founder.portrait} className="institute-teaser__photo" />
          <figcaption className="institute-teaser__caption">
            <strong>
              {founder.name} ({founder.shortName})
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
            {platforms.map((platform) => (
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
