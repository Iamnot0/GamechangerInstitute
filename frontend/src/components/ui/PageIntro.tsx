import type { ReactNode } from "react";
import { preload } from "react-dom";

type PageIntroProps = {
  context: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
};

export function PageIntro({ context, title, lede, children }: PageIntroProps) {
  preload("/images/backdrop-rings.svg", { as: "image" });

  return (
    <section className="page-intro" aria-labelledby="page-title">
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
