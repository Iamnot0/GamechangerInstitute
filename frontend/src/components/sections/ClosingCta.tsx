import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { NavItem } from "@/content/site";

type ClosingCtaProps = {
  title: readonly string[];
  body: string;
  primary: NavItem;
  secondary?: NavItem;
};

export function ClosingCta({ title, body, primary, secondary }: ClosingCtaProps) {
  return (
    <section className="closing-cta" aria-labelledby="closing-cta-title">
      <div className="closing-cta__inner">
        <h2 id="closing-cta-title" className="closing-cta__title">
          {title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <div className="closing-cta__aside">
          <p className="closing-cta__body">{body}</p>
          <div className="closing-cta__actions">
            <ButtonLink href={primary.href} variant="inverse">
              {primary.label}
            </ButtonLink>
            {secondary ? (
              <Link href={secondary.href} className="text-link text-link--inverse">
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
