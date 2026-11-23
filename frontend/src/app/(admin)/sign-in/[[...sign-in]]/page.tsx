import { SignIn } from "@clerk/nextjs";
import { Wordmark } from "@/components/layout/Wordmark";

export default function StaffSignInPage() {
  return (
    <main className="staff-sign-in">
      <div className="staff-sign-in__inner">
        <Wordmark />
        <h1 className="staff-sign-in__title">Staff console</h1>
        <p className="staff-sign-in__lede">Sign in with the account the Institute invited. Access is by invitation only.</p>
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up/" fallbackRedirectUrl="/admin/enquiries/" />
      </div>
    </main>
  );
}
