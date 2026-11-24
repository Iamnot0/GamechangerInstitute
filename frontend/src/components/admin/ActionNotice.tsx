import type { FieldError } from "@/lib/admin-api";

export type Notice = { tone: "ok" | "error"; message: string; fieldErrors?: readonly FieldError[] } | null;

export function ActionNotice({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div className={`action-notice action-notice--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
      <p>{notice.message}</p>
      {notice.fieldErrors?.length ? (
        <ul>
          {notice.fieldErrors.map((error) => (
            <li key={`${error.field}:${error.message}`}>{error.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
