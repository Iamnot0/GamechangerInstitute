export type Theme = "light" | "dark";

const themeStorageKey = "gci-theme";

/**
 * Runs inline in <head> before first paint, so the stored or system theme is
 * applied without a flash. Kept dependency-free because it is serialised.
 */
export const themeInitScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${themeStorageKey}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t}catch(e){d.dataset.theme="light"}})()`;

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme, { persist }: { persist: boolean }) {
  document.documentElement.dataset.theme = theme;
  if (!persist) return;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the theme still applies for this visit.
  }
}

export function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
