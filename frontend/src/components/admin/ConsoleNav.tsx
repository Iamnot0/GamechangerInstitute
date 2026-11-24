"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/ConsoleIcon";

export type ConsoleNavItem = {
  href: Route;
  label: string;
  icon: ConsoleIconName;
  count?: { value: number; meaning: string };
};

type ConsoleNavProps = { items: ConsoleNavItem[] };

export function ConsoleNav({ items }: ConsoleNavProps) {
  const pathname = usePathname();

  return (
    <nav className="console-nav" aria-label="Staff console">
      <ul className="console-nav__list">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="console-nav__link"
              title={item.label}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              <ConsoleIcon name={item.icon} />
              <span className="console-nav__label">{item.label}</span>
              {item.count && item.count.value > 0 ? (
                <span className="console-nav__count">
                  {item.count.value}
                  <span className="visually-hidden"> {item.count.meaning}</span>
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
