import Link from "next/link";
import { AccessDenied } from "@/components/admin/AccessDenied";
import type { AdminApiError } from "@/lib/admin-api";

export function ApiErrorState({ error }: { error: AdminApiError }) {
  if (error.status === 403) return <AccessDenied />;

  const sessionEnded = error.status === 401;
  return (
    <section className="admin-state" role="alert">
      <h1 className="admin-state__title">{sessionEnded ? "Your session has ended" : "Enquiries could not be loaded"}</h1>
      <p className="admin-state__body">{error.message}</p>
      <Link href={sessionEnded ? "/sign-in/" : "/admin/enquiries/"} className="button button--secondary">
        {sessionEnded ? "Sign in again" : "Try again"}
      </Link>
    </section>
  );
}
