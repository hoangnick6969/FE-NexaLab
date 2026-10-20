import { useSyncExternalStore } from "react";

/**
 * Theme preference (acc-4). Stored locally so it applies before sign-in and before first paint
 * (see the inline script in index.html), and on the profile so it follows the user across devices.
 */
export type ThemePreference = "system" | "light" | "dark";
export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Theo hệ thống" },
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
];

const STORAGE_KEY = "nexalab.theme";
const META_COLOR = { light: "#173f39", dark: "#111816" };
const isPreference = (value: unknown): value is ThemePreference => value === "system" || value === "light" || value === "dark";
const darkQuery = () => (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null);

function stored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isPreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

function apply(preference: ThemePreference) {
  const resolved = preference === "dark" || (preference === "system" && darkQuery()?.matches) ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOR[resolved]);
}

let current = stored();
const listeners = new Set<() => void>();
apply(current);
// "System" follows the operating system while the app is open.
darkQuery()?.addEventListener("change", () => current === "system" && apply("system"));

export function setThemePreference(preference: ThemePreference) {
  if (!isPreference(preference)) return;
  current = preference;
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* Private mode or blocked storage: the theme still applies for this page. */
  }
  apply(preference);
  listeners.forEach((listener) => listener());
}

export function useThemePreference() {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => current,
  );
}
