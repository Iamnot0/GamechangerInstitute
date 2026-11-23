import { SignUp } from "@clerk/nextjs";
import { Wordmark } from "@/components/layout/Wordmark";

// Sign-up is restricted to invitations in Clerk; this page only completes an invited account.
export default function StaffSignUpPage() {
  return (
    <main className="staff-sign-in">
      <div className="staff-sign-in__inner">
        <Wordmark />
        <h1 className="staff-sign-in__title">Accept your invitation</h1>
        <p className="staff-sign-in__lede">Create your staff account. You will need the email address the Institute invited.</p>
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in/" fallbackRedirectUrl="/admin/enquiries/" />
      </div>
    </main>
  );
}
