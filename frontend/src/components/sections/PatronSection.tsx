import { Photo } from "@/components/ui/Photo";
import { patron } from "@/content/institute";

export function PatronSection() {
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
