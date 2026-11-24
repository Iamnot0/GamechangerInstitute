import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { StaffRole } from "@/lib/admin-types";

export const STAFF_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-gci_staff" : "gci_staff";

const apiBaseUrl = process.env.BACKEND_INTERNAL_URL ?? process.env.ADMIN_API_URL ?? "http://localhost:8000";

export async function getStaffToken(): Promise<string | null> {
  const store = await cookies();
  return store.get("__Host-gci_staff")?.value ?? store.get("gci_staff")?.value ?? null;
}

export type StaffSession = {
  signedIn: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
  role: StaffRole | null;
};

const anonymousSession: StaffSession = {
  signedIn: false,
  isStaff: false,
  isAdmin: false,
  userId: null,
  email: null,
  role: null,
};

export const getStaffSession = cache(async (): Promise<StaffSession> => {
  const token = await getStaffToken();
  if (!token) return anonymousSession;

  try {
    const response = await fetch(new URL("/v1/auth/session", apiBaseUrl), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return anonymousSession;
    const identity = (await response.json()) as { id: string; email: string; role: StaffRole };
    return {
      signedIn: true,
      isStaff: true,
      isAdmin: identity.role === "admin",
      userId: identity.id,
      email: identity.email,
      role: identity.role,
    };
  } catch {
    return anonymousSession;
  }
});
