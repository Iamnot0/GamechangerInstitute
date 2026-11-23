import { SignOutButton } from "@clerk/nextjs";

export function AccessDenied() {
  return (
    <section className="admin-state" aria-labelledby="access-denied-title">
      <h1 id="access-denied-title" className="admin-state__title">
        This account does not have staff access
      </h1>
      <p className="admin-state__body">
        You are signed in, but your account has not been given a staff role. Ask the programme director to grant
        access, then sign in again.
      </p>
      <SignOutButton redirectUrl="/sign-in/">
        <button type="button" className="button button--secondary">
          Sign out
        </button>
      </SignOutButton>
    </section>
  );
}
