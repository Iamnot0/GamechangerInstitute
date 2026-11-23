import type { ReactNode } from "react";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getStaffSession } from "@/lib/staff";

export default async function StaffConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getStaffSession();

  return (
    <>
      <AdminHeader email={session.email} />
      <main id="main" className="admin">
        {session.isStaff ? children : <AccessDenied />}
      </main>
    </>
  );
}
