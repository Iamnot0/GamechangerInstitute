import "server-only";
import { auth } from "@clerk/nextjs/server";

const staffRoles = new Set(
  (process.env.STAFF_ROLES ?? "admin,staff")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
);

/** UI-side gate only. The API enforces the same roles on every request. */
export async function getStaffSession() {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.role;
  return {
    signedIn: userId !== null,
    isStaff: typeof role === "string" && staffRoles.has(role),
    email: sessionClaims?.email ?? null,
  };
}
