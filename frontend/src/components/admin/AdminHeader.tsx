import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";

type AdminHeaderProps = { email: string | null };

export function AdminHeader({ email }: AdminHeaderProps) {
  return (
    <header className="admin-header">
      <div className="admin-header__inner">
        <div className="admin-header__brand">
          <Wordmark />
          <span className="admin-header__label">Staff console</span>
        </div>
        <nav className="admin-header__nav" aria-label="Staff console">
          <Link href="/admin/enquiries/" className="admin-header__link">
            Enquiries
          </Link>
        </nav>
        <div className="admin-header__account">
          {email ? <span className="admin-header__email">{email}</span> : null}
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
    </header>
  );
}
