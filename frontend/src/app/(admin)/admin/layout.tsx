import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getStaffSession } from "@/lib/staff";

export default async function StaffConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getStaffSession();
  if (!session.signedIn) redirect("/sign-in/");

  return (
    <>
      <AdminHeader email={session.email} isAdmin={session.isAdmin} />
      <main id="main" className="admin">
        {session.isStaff ? children : <AccessDenied />}
      </main>
    </>
  );
}
