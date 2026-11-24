import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { JsonLd } from "@/components/seo/JsonLd";
import { organisationGraph } from "@/lib/structured-data";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SmoothScroll />
      <SkipLink />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <JsonLd data={organisationGraph} />
    </>
  );
}
