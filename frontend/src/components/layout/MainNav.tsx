"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { primaryNav, registerLink } from "@/content/site";

const normalise = (path: string) => path.replace(/\/+$/, "") || "/";

export function MainNav() {
  const pathname = normalise(usePathname());
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const panelId = useId();

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isCurrent = (href: string) => pathname === normalise(href);

  return (
    <nav className="main-nav" aria-label="Primary">
      <button
        type="button"
        className="main-nav__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="main-nav__toggle-bars" aria-hidden="true" />
        <span className="main-nav__toggle-label">{open ? "Close" : "Menu"}</span>
      </button>

      <div id={panelId} className="main-nav__panel" data-open={open}>
        <ul className="main-nav__list">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="main-nav__link"
                aria-current={isCurrent(item.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={registerLink.href}
          className="button button--primary main-nav__cta"
          aria-current={isCurrent(registerLink.href) ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          {registerLink.label}
        </Link>
      </div>
    </nav>
  );
}
