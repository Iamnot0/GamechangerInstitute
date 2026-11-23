import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="not-found" aria-labelledby="page-title">
      <div className="not-found__inner">
        <p className="not-found__code">404</p>
        <h1 id="page-title" className="not-found__title">
          This page is not here.
        </h1>
        <p className="not-found__body">The link may be out of date, or the page may have moved.</p>
        <ButtonLink href="/">Go to the home page</ButtonLink>
      </div>
    </section>
  );
}
