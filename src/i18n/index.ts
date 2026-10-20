import { useSyncExternalStore } from "react";

/**
 * UI language (acc-5, D-ACC-04). Copy lives next to each feature in `defineText({ vi, en })`;
 * the compiler requires `en` to have exactly the shape of `vi`. Lesson content and server
 * messages stay Vietnamese; server errors are translated by their stable `code` (see errors.ts).
 *
 * Changing the language remounts the app (main.tsx keys it by locale), so `t = someText()`
 * can be read anywhere during render without a hook.
 */
export type Locale = "vi" | "en";
export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const STORAGE_KEY = "nexalab.locale";
const isLocale = (value: unknown): value is Locale => value === "vi" || value === "en";

function stored(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : "vi";
  } catch {
    return "vi";
  }
}

let current: Locale = stored();
const listeners = new Set<() => void>();
document.documentElement.lang = current;

export const getLocale = () => current;

export function setLocale(next: Locale) {
  if (!isLocale(next) || next === current) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* Private mode or blocked storage: the language still applies for this page. */
  }
  document.documentElement.lang = next;
  listeners.forEach((listener) => listener());
}

export function useLocale() {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => current,
  );
}

/** Same keys as the Vietnamese source; strings widen to string, functions keep their signature. */
export type Translation<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R extends string ? string : R
  : T extends string
    ? string
    : T extends readonly (infer U)[]
      ? readonly Translation<U>[]
      : { [K in keyof T]: Translation<T[K]> };

export function defineText<T extends object>(messages: { vi: T; en: Translation<T> }) {
  return () => messages[current] as Translation<T>;
}

/** BCP 47 tag for Intl formatting. */
export const intlLocale = () => (current === "en" ? "en-GB" : "vi-VN");
export const formatDate = (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleDateString(intlLocale(), options);
export const formatDateTime = (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleString(intlLocale(), options);
export const formatTime = (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleTimeString(intlLocale(), options);
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => value.toLocaleString(intlLocale(), options);
