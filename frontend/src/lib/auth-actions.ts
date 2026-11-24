"use server";

import { checkBotId } from "botid/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminApiError, requestStaffCode, revokeStaffSession, verifyStaffCode } from "@/lib/admin-api";
import { STAFF_COOKIE_NAME, getStaffToken } from "@/lib/staff";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const codePattern = /^\d{6}$/;

const automatedMessage = "We could not confirm that this request came from a person. Reload the page and try again.";

export type AuthStepResult = { ok: true } | { ok: false; message: string };

/** The sign-in page attaches a challenge to each request and Vercel judges it. Away from Vercel there is no judge. */
async function isAutomated(): Promise<boolean> {
  const verdict = await checkBotId({ developmentOptions: { isDevelopment: process.env.VERCEL !== "1" } });
  return verdict.isBot;
}

export async function sendSignInCode(rawEmail: string): Promise<AuthStepResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (await isAutomated()) return { ok: false, message: automatedMessage };

  try {
    await requestStaffCode(email);
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminApiError) return { ok: false, message: error.message };
    throw error;
  }
}

export async function completeSignIn(rawEmail: string, rawCode: string): Promise<{ ok: false; message: string }> {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.replace(/\s+/g, "");
  if (!emailPattern.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (!codePattern.test(code)) return { ok: false, message: "Enter the 6-digit code from your email." };
  if (await isAutomated()) return { ok: false, message: automatedMessage };

  let session;
  try {
    session = await verifyStaffCode(email, code);
  } catch (error) {
    if (error instanceof AdminApiError) return { ok: false, message: error.message };
    throw error;
  }

  const store = await cookies();
  store.set(STAFF_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expires_at),
  });

  redirect("/admin/enquiries/");
}

export async function signOutStaff(): Promise<never> {
  const token = await getStaffToken();
  if (token) await revokeStaffSession(token);

  const store = await cookies();
  store.delete("__Host-gci_staff");
  store.delete("gci_staff");
  redirect("/sign-in/");
}
