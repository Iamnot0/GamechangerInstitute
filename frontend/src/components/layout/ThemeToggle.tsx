"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { applyTheme, readTheme, subscribeToTheme, type Theme } from "@/lib/theme";

const revealEasing = "cubic-bezier(.2,.7,.2,1)";

function revealFrom(button: HTMLElement, update: () => void) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !document.startViewTransition) {
    update();
    return;
  }

  const { left, top, width, height } = button.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = document.startViewTransition(update);
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 600, easing: revealEasing, pseudoElement: "::view-transition-new(root)" },
    );
  });
}

function MoonIcon() {
  return (
    <svg className="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.6 14.6A8.6 8.6 0 0 1 9.4 3.4a8.6 8.6 0 1 0 11.2 11.2Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7" />
    </svg>
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, readTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    revealFrom(event.currentTarget, () => applyTheme(next, { persist: true }));
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${next} theme`}
      onClick={onClick}
    >
      <MoonIcon />
      <SunIcon />
    </button>
  );
}
