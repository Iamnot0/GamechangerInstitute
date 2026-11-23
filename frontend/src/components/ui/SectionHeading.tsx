import type { ReactNode } from "react";

type SectionHeadingProps = {
  id: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "start" | "split";
};

export function SectionHeading({ id, title, lede, align = "start" }: SectionHeadingProps) {
  return (
    <header className={`section-heading section-heading--${align}`}>
      <h2 id={id} className="section-heading__title">
        {title}
      </h2>
      {lede ? <p className="section-heading__lede">{lede}</p> : null}
    </header>
  );
}
