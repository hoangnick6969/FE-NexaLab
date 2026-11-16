import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false },
  },
});

// Perf review 2026-11-16 item 7: the subject list and the released curriculum change only when content is published
// (the API caches them for 60 s), so moving between dashboard, lessons, progress and the e-book reuses them for 5 minutes.
// Mutations that change them still invalidate these keys.
const CATALOG_STALE_MS = 5 * 60_000;
for (const key of ["subjects", "open-curriculum", "student-open-curriculum"]) queryClient.setQueryDefaults([key], { staleTime: CATALOG_STALE_MS });
