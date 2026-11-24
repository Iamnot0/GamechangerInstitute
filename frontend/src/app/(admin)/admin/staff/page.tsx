import type { Metadata } from "next";
import { ApiErrorState } from "@/components/admin/ApiErrorState";
import { StaffManager } from "@/components/admin/StaffManager";
import { AdminApiError, listStaffUsers } from "@/lib/admin-api";
import { getStaffSession } from "@/lib/staff";

export const metadata: Metadata = { title: "Staff access" };

export default async function StaffPage() {
  const session = await getStaffSession();
  if (!session.isAdmin) {
    return (
      <section className="admin-state" aria-labelledby="staff-denied-title">
        <h1 id="staff-denied-title" className="admin-state__title">
          Administrator access required
        </h1>
        <p className="admin-state__body">Only administrators can view or change who has access to the staff console.</p>
      </section>
    );
  }

  let users;
  try {
    users = await listStaffUsers();
  } catch (error) {
    if (error instanceof AdminApiError) return <ApiErrorState error={error} />;
    throw error;
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Staff access</h1>
        <p className="admin-page__lede">
          Only email addresses listed here can receive a sign-in code. Removing someone revokes their active sessions immediately.
        </p>
      </header>
      <StaffManager users={users} currentUserId={session.userId} />
    </div>
  );
}
