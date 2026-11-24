const singaporeTime = new Intl.DateTimeFormat("en-SG", {
  timeZone: "Asia/Singapore",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(iso: string): string {
  return singaporeTime.format(new Date(iso));
}

const dayFormatter = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Singapore" });

/** Accepts a calendar date (2026-11-24) or a timestamp. A bare date is read as that day in Singapore. */
export function formatDay(value: string): string {
  return dayFormatter.format(new Date(value.length === 10 ? `${value}T12:00:00+08:00` : value));
}

/** A file size for readers: one decimal place, and none when it is a whole number. */
export const megabytes = (bytes: number) => `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
