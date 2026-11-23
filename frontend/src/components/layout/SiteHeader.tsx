import { MainNav } from "@/components/layout/MainNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Wordmark />
        <div className="site-header__actions">
          <MainNav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
