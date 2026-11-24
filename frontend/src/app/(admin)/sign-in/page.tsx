import { redirect } from "next/navigation";
import { SignInForm } from "@/components/admin/SignInForm";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { getStaffSession } from "@/lib/staff";

export default async function StaffSignInPage() {
  const session = await getStaffSession();
  if (session.isStaff) redirect("/admin/enquiries/");

  return (
    <main id="main" className="staff-sign-in">
      <div className="staff-sign-in__bar">
        <ThemeToggle />
      </div>
      <div className="staff-sign-in__inner">
        <Wordmark />
        <h1 className="staff-sign-in__title">Staff console</h1>
        <p className="staff-sign-in__lede">
          Enter an invited staff email address to receive a single-use 6-digit sign-in code.
        </p>
        <SignInForm />
      </div>
    </main>
  );
}
