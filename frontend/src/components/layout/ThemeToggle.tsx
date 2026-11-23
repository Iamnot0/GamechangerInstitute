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
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
