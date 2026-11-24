import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { signOutStaff } from "@/lib/auth-actions";

type AdminHeaderProps = { email: string | null; isAdmin: boolean };

export function AdminHeader({ email, isAdmin }: AdminHeaderProps) {
  const navItems = [
    { href: "/admin/enquiries/", label: "Enquiries" },
    { href: "/admin/posts/", label: "Media" },
    ...(isAdmin ? [{ href: "/admin/staff/", label: "Staff" }] : []),
  ];

  return (
    <header className="admin-header">
      <div className="admin-header__inner">
        <div className="admin-header__brand">
          <Wordmark />
          <span className="admin-header__label">Staff console</span>
        </div>
        <nav className="admin-header__nav" aria-label="Staff console">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="admin-header__link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-header__account">
          {email ? <span className="admin-header__email">{email}</span> : null}
          <ThemeToggle />
          <form action={signOutStaff}>
            <button type="submit" className="text-button">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
