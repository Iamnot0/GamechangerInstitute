"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminApiError, createStaffUser, deleteEnquiry, deleteStaffUser, updateEnquiryStatus } from "@/lib/admin-api";
import { enquiryStatuses, type EnquiryStatus, type StaffRole } from "@/lib/admin-types";
import { getStaffSession } from "@/lib/staff";

export type StatusFormState =
  | { outcome: "idle" }
  | { outcome: "saved"; status: EnquiryStatus }
  | { outcome: "error"; message: string };

const isStatus = (value: FormDataEntryValue | null): value is EnquiryStatus =>
  typeof value === "string" && enquiryStatuses.includes(value as EnquiryStatus);

export async function changeEnquiryStatus(_: StatusFormState, form: FormData): Promise<StatusFormState> {
  const id = form.get("id");
  const status = form.get("status");
  const expected = form.get("expected_status");
  const note = String(form.get("note") ?? "").trim();

  if (typeof id !== "string" || !isStatus(status) || !isStatus(expected)) {
    return { outcome: "error", message: "Choose a new status." };
  }
  if (status === expected) return { outcome: "error", message: "Choose a status different from the current one." };
  if (note.length > 1000) return { outcome: "error", message: "Keep the note under 1,000 characters." };

  try {
    await updateEnquiryStatus(id, { status, expected_status: expected, note: note || null });
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 409) {
      return { outcome: "error", message: "Someone else changed this enquiry. Reload the page to see the latest status." };
    }
    if (error instanceof AdminApiError) return { outcome: "error", message: error.message };
    throw error;
  }

  revalidatePath(`/admin/enquiries/${id}/`);
  revalidatePath("/admin/enquiries/");
  return { outcome: "saved", status };
}

export async function removeEnquiry(id: string): Promise<{ ok: false; message: string }> {
  try {
    if (!(await getStaffSession()).isStaff) throw new AdminApiError(403, "Only staff can do this.");
    await deleteEnquiry(id);
  } catch (error) {
    if (error instanceof AdminApiError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath("/admin/enquiries/");
  redirect("/admin/enquiries/");
}

export async function addStaffMember(rawEmail: string, role: StaffRole): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (role !== "admin" && role !== "staff") {
    return { ok: false, message: "Choose a valid role." };
  }

  try {
    if (!(await getStaffSession()).isAdmin) throw new AdminApiError(403, "Only an administrator can manage staff accounts.");
    await createStaffUser(email, role);
  } catch (error) {
    if (error instanceof AdminApiError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath("/admin/staff/");
  return { ok: true };
}

export async function removeStaffMember(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    if (!(await getStaffSession()).isAdmin) throw new AdminApiError(403, "Only an administrator can manage staff accounts.");
    await deleteStaffUser(userId);
  } catch (error) {
    if (error instanceof AdminApiError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath("/admin/staff/");
  return { ok: true };
}
