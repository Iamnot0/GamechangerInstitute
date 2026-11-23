import "server-only";
import { auth } from "@clerk/nextjs/server";

const staffRoles = new Set(
  (process.env.STAFF_ROLES ?? "org:admin,org:member")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
);
const staffOrganizationId = process.env.STAFF_ORGANIZATION_ID?.trim() || null;

/**
 * UI-side gate only; the API enforces the same rule on every request. Fails closed:
 * without a configured staff organization nobody is treated as staff.
 */
export async function getStaffSession() {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.role;
  const inStaffOrganization = staffOrganizationId !== null && sessionClaims?.org_id === staffOrganizationId;
  return {
    signedIn: userId !== null,
    isStaff: inStaffOrganization && typeof role === "string" && staffRoles.has(role),
    email: sessionClaims?.email ?? null,
  };
}
