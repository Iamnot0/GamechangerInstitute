import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { ConsoleSidebar } from "@/components/admin/ConsoleSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getEnquirySummary } from "@/lib/admin-api";
import { load } from "@/lib/admin-load";
import { consoleMenuCookie } from "@/lib/console-menu";
import { getStaffSession } from "@/lib/staff";

export default async function StaffConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getStaffSession();
  if (!session.signedIn) redirect("/sign-in/");
  const summary = session.isStaff ? await load(getEnquirySummary) : null;
  const newEnquiries = summary && "data" in summary ? summary.data.by_status.new : null;

  return (
    <div className="console">
      <ConsoleSidebar
        email={session.email}
        isAdmin={session.isAdmin}
        newEnquiries={newEnquiries}
        startsCollapsed={(await cookies()).get(consoleMenuCookie)?.value === "collapsed"}
      />
      <div className="console__page">
        <div className="console__topbar">
          <ThemeToggle />
        </div>
        <main id="main" className="console__main">
          {session.isStaff ? children : <AccessDenied />}
        </main>
      </div>
    </div>
  );
}
