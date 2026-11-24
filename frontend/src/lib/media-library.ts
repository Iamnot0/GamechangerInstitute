export const libraryId = "library";

/** Brings the library into view after something is added, so the new item is not left below the fold. */
export function showLibrary() {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(libraryId)?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
}
