# Project structure

Workspace overview and backend layout: `../BE-NexaLab/docs/architecture/project-structure.md`.

## Frontend (`src/`)

```text
src/
  main.tsx                 entry: error boundary, QueryClientProvider, BrowserRouter
  app/
    App.tsx                routes, role-aware shell, top bar, password gate; lazy-loads every page
    query-client.ts        the shared TanStack QueryClient
  lib/
    api.ts                 fetch wrapper, auth/session (useAuth), idempotency keys, API types
    quiz-contract.typecheck.ts  compile-time check of the quiz API contract
  components/
    ui.tsx                 shared UI primitives
    PageHeading.tsx
  features/<domain>/       one folder per product area; a page and the components only it uses
    admin/  auth/  classes/  dashboard/  ebook/  labs/  landing/  learning/  lessons/  progress/  saved/  settings/
  styles.css               global styles
```

| Feature | Contents |
|---|---|
| `auth` | Login for students (username) and adults (email) |
| `dashboard` | Role dashboards and student stats |
| `lessons` | Teacher lesson authoring/library (`Lessons`), library filters, coverage, review widgets |
| `learning` | Student assignments and the assigned lesson pathway (reading, video, study cards, quiz steps) |
| `ebook` | Lesson detail and ebook reader |
| `labs` | Lab library, circuit/chemistry/eye labs, practical pathway steps, lab metadata (`lab-info.ts`) |
| `progress` | Progress overview and history |
| `classes` | Teacher class management |
| `admin` | Admin console |
| `landing`, `saved`, `settings` | Public landing page, saved experiments, account settings |

Conventions:

- A feature imports from `lib/`, `components/` and, when it must, from another feature's exported component; `app/` is the only
  place that knows every route. Nothing imports `app/App.tsx`.
- The API client lives in `lib/`, not an `api/` folder: in dev mode Vite serves modules by path, and a `/src/api/…` URL would
  collide with `/api` proxy rules and test mocks such as `**/api/**`.
- Pages are lazy-loaded from `app/App.tsx`, so each feature builds into its own chunk.
- Playwright scenarios stay in `tests/`.

### Known follow-ups

- `features/admin/Admin.tsx` (≈1500 lines), `features/classes/classes.tsx` (≈1000 lines) and `features/lessons/Lessons.tsx`
  (≈650 lines) can be split into smaller components within their feature folders.
