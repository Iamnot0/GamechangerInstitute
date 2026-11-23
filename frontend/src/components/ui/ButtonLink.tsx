import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  variant?: "primary" | "secondary" | "inverse" | "outline-inverse";
  children: ReactNode;
};

export function ButtonLink({ href, variant = "primary", children }: ButtonLinkProps) {
  return (
    <Link href={href} className={`button button--${variant}`}>
      {children}
    </Link>
  );
}
