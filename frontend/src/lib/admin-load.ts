import "server-only";
import { AdminApiError } from "@/lib/admin-api";

export type Loaded<T> = { data: T } | { error: AdminApiError };

/** Runs staff API calls for a page and hands back either the data or the error to show. */
export async function load<T>(work: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { data: await work() };
  } catch (error) {
    if (error instanceof AdminApiError) return { error };
    throw error;
  }
}
