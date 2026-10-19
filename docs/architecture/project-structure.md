# Project structure

Workspace overview and backend layout: `../BE-NexaLab/docs/architecture/project-structure.md`.

## Frontend (`src/`)

```text
src/
  main.tsx                 entry: error boundary, QueryClientProvider, BrowserRouter
  app/
    App.tsx                routes and role-aware shell; lazy-loads every page
    TopbarBreadcrumb.tsx   breadcrumb trail for the top bar
    PasswordGate.tsx       forced change of a temporary student password
    query-client.ts        the shared TanStack QueryClient
  lib/
    api.ts                 fetch wrapper, auth/session (useAuth), idempotency keys, API types
    test-status.ts         assigned-test status labels shared by student, teacher and parent views (I3)
    urls.ts                https-only URL guard for external links and media
    quiz-contract.typecheck.ts  compile-time check of the quiz API contract
  components/
    ui.tsx                 shared UI primitives
    PageHeading.tsx
  features/<domain>/       one folder per product area; a page and the components only it uses
  styles.css               global styles
```

| Feature | Contents |
|---|---|
| `auth` | Login for students (username) and adults (email) |
| `dashboard` | `Dashboard` (role switch, adult view), `StudentDashboard` |
| `lessons` | `Lessons` (student hub and teacher library), `lesson-catalog.ts` (hub merge/filter), `LessonDetail` (student lesson page: reading, video, cards, basic exercise tabs), `VideoLearningStep`, `StudyCardsStep`, `LessonEditorFields`, `library.tsx` (library filters, coverage, review and attribution widgets) |
| `assignments` | `/assignments` routes: `StudentAssignments`, `AssignedLearning` (assignment pathway), `QuizLearningStep`, `AssignedTest` (I3 scored test) |
| `ebook` | `EbookReader` (textbook reader and annotations) |
| `labs` | `LabLibrary`, `Lab`, the `Circuit`/`Chemistry`/`Eye` workspaces, `HandControl`, pathway steps (`PracticalPathwayStep`, `CircuitPathwayStep`), `lab-info.ts` |
| `progress` | `ProgressPage` (student/parent), `StudentProgress`, `AssignmentProgress`, `ActivityList`, `EvidenceSheet`, `progress-format.ts` |
| `classes` | `Classes` (role switch), `TeacherClasses`, `ClassDetail`, `Roster`, `Assignments` (assign/edit), `TestAssignments` (I3 late queue, reject, deadline revision, tracking), `ClassSpaceResources`, `PracticeAnalytics`, `StudentClasses`, `class-ui.tsx` (dialogs, mutation and load-error helpers), `class-types.ts` |
| `admin` | `Admin` (tab shell) and one file per tab: `Overview`, `Users`, `Taxonomy`, `Content`, `Simulations`, `Assets`, `AuditExplorer`; `admin-ui.tsx` (labels, status, dialogs, paging) |
| `landing`, `saved`, `settings` | Public landing page, saved experiments, account settings |

Conventions:

- A component file is PascalCase and named after its main export; a module of helpers, types or constants is kebab-case
  (`class-ui.tsx`, `class-types.ts`, `progress-format.ts`). A feature's shared helpers live in its own `*-ui`/`*-format`
  module so sibling components never import each other in a cycle.
- A feature imports from `lib/`, `components/` and, when it must, from another feature's exported component; `app/` is the only
  place that knows every route. Nothing imports `app/App.tsx`. Code shared by several features belongs in `lib/` or `components/`.
- The API client lives in `lib/`, not an `api/` folder: in dev mode Vite serves modules by path, and a `/src/api/…` URL would
  collide with `/api` proxy rules and test mocks such as `**/api/**`.
- Pages are lazy-loaded from `app/App.tsx`, so each feature builds into its own chunk.
- Playwright scenarios stay in `tests/`; shared live-test helpers are in `tests/fixtures/live.ts`.

### Known follow-ups

- `features/lessons/Lessons.tsx` (≈600 lines) is one component with a teacher and a student branch; split it into a student hub and
  a teacher library once both have their own state.
- `styles.css` (≈5800 lines) is one global stylesheet; splitting it per feature needs a cascade-order review.
