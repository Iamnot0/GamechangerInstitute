import type { ReactNode } from "react";
import { preload } from "react-dom";
import { Photo } from "@/components/ui/Photo";
import type { Photo as PhotoData } from "@/content/institute";

type PageIntroProps = {
  context: string;
  title: ReactNode;
  lede?: ReactNode;
  photo?: PhotoData;
  children?: ReactNode;
};

export function PageIntro({ context, title, lede, photo, children }: PageIntroProps) {
  if (!photo) preload("/images/backdrop-rings.svg", { as: "image" });

  return (
    <section className={photo ? "page-intro page-intro--photo" : "page-intro"} aria-labelledby="page-title">
      {photo ? (
        <div className="page-intro__backdrop">
          <Photo photo={photo} className="page-intro__photo" priority />
        </div>
      ) : null}
      <div className="page-intro__inner">
        <p className="page-intro__context">{context}</p>
        <h1 id="page-title" className="page-intro__title">
          {title}
        </h1>
        {lede ? <p className="page-intro__lede">{lede}</p> : null}
        {children ? <div className="page-intro__aside">{children}</div> : null}
      </div>
    </section>
  );
}
