import Link from "next/link";
import { Wordmark } from "@/components/layout/Wordmark";
import { footerNav, site } from "@/content/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Wordmark />
          <p className="site-footer__tagline">
            {site.tagline.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <ul>
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="site-footer__legal">
          © {year} {site.name}. The Leadership Transformation Programme is ICF-informed. It is not accredited or endorsed by
          the World Health Organization.
        </p>
      </div>
    </footer>
  );
}
