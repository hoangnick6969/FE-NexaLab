/**
 * Return path to the Lab library with the filters the student last used. `/labs` keeps its filters in the URL query
 * (`?subject=biology&grade=8…`) and records that query here; every Lab Space exit to "/labs" (header "← Quay về",
 * whichever mode the Guided / Explore switch left the student in) goes back to `/labs` plus that query.
 * Session storage: per tab, gone when the tab closes; failures fall back to plain "/labs".
 */
const KEY = "nexalab:labs-library-search";

export function rememberLabsSearch(search: string) {
  try {
    if (search && search !== "?") window.sessionStorage.setItem(KEY, search.startsWith("?") ? search : `?${search}`);
    else window.sessionStorage.removeItem(KEY);
  } catch { /* best effort */ }
}

export function labsListHref() {
  try {
    const search = window.sessionStorage.getItem(KEY);
    return search && /^\?[\w=&%.+-]*$/.test(search) ? `/labs${search}` : "/labs";
  } catch {
    return "/labs";
  }
}
