"use client";

import { useState } from "react";
import { ConsoleIcon } from "@/components/admin/ConsoleIcon";
import { ConsoleNav, type ConsoleNavItem } from "@/components/admin/ConsoleNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { signOutStaff } from "@/lib/auth-actions";
import { consoleMenuCookie } from "@/lib/console-menu";

type ConsoleSidebarProps = { email: string | null; isAdmin: boolean; newEnquiries: number | null; startsCollapsed: boolean };

const oneYear = 60 * 60 * 24 * 365;

export function ConsoleSidebar({ email, isAdmin, newEnquiries, startsCollapsed }: ConsoleSidebarProps) {
  const [collapsed, setCollapsed] = useState(startsCollapsed);
  const items: ConsoleNavItem[] = [
    {
      href: "/admin/enquiries/",
      label: "Enquiries",
      icon: "enquiries",
      count: newEnquiries === null ? undefined : { value: newEnquiries, meaning: "new" },
    },
    { href: "/admin/posts/", label: "Media", icon: "media" },
    ...(isAdmin ? [{ href: "/admin/staff/" as const, label: "Staff", icon: "staff" as const }] : []),
  ];

  // Kept in a cookie so the server draws the menu the way it was left, with no jump on load.
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${consoleMenuCookie}=${next ? "collapsed" : "open"}; path=/admin; max-age=${oneYear}; samesite=lax`;
  };

  return (
    <header className="console__sidebar" data-collapsed={collapsed}>
      <div className="console__sidebar-inner">
        <div className="console__brand">
          <Wordmark />
          <span className="console__label">Staff console</span>
        </div>
        <ConsoleNav items={items} />
        <div className="console__account">
          {email ? <p className="console__email">{email}</p> : null}
          <div className="console__account-tools">
            <form action={signOutStaff}>
              <button type="submit" className="console__tool" title="Sign out">
                <ConsoleIcon name="signOut" />
                <span className="console__tool-label">Sign out</span>
              </button>
            </form>
            <ThemeToggle />
          </div>
          <button type="button" className="console__tool console__toggle" aria-expanded={!collapsed} title={collapsed ? "Expand menu" : "Collapse menu"} onClick={toggle}>
            <ConsoleIcon name={collapsed ? "expand" : "collapse"} />
            <span className="console__tool-label">{collapsed ? "Expand menu" : "Collapse menu"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
