import { signOutStaff } from "@/lib/auth-actions";

export function AccessDenied() {
  return (
    <section className="admin-state" aria-labelledby="access-denied-title">
      <h1 id="access-denied-title" className="admin-state__title">
        This account does not have staff access
      </h1>
      <p className="admin-state__body">
        You are signed in, but your account has not been granted a staff role. Ask an administrator to grant access,
        then sign in again.
      </p>
      <form action={signOutStaff}>
        <button type="submit" className="button button--secondary">
          Sign out
        </button>
      </form>
    </section>
  );
}
