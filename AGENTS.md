# NexaLab frontend context

- This repository is the React 18, TypeScript and Vite client for the sibling `BE-NexaLab` NestJS API. It uses React Router, TanStack Query, Zustand, React Flow, Three.js/React Three Fiber, TipTap and DOMPurify.
- Routes and the role-aware shell are in `src/app/App.tsx`; pages live in `src/features/<domain>/` (auth, dashboard, lessons, learning, ebook, labs, progress, classes, admin, landing, saved, settings); API and session handling are in `src/lib/api.ts`; shared UI is in `src/components/`; global styles are in `src/styles.css`; Playwright scenarios are in `tests/`. Layout and conventions: `docs/architecture/project-structure.md`.
- Commands: `npm run dev`, `npm run lint`, `npm run build`, and `npm run test:e2e`. E2E requires the configured backend, seed data and Playwright browser. The dev proxy sends `/api` to `http://127.0.0.1:4000`.
- Keep role-specific flows intact: students use teacher-provisioned usernames; teachers, parents and admins use email accounts. Do not treat hidden UI as authorization: API RBAC and server ownership checks remain authoritative.
- The client may preview simulations using the versioned `@nexalab/sim` tarball, but server results are official. Preserve the shared package versioning workflow when changing simulation behavior.
- Product decisions, architecture decisions, and BMAD planning artifacts live in the sibling backend repository:
  - Product requirements: `../BE-NexaLab/docs/product/prd.md`
  - Architecture Spine: `../BE-NexaLab/_bmad-output/planning-artifacts/architecture-spine-nexalab-release-1/ARCHITECTURE-SPINE.md`
  - Epic specs and tickets: `../BE-NexaLab/_bmad-output/specs/`
  - Sprint status: `../BE-NexaLab/_bmad-output/implementation-artifacts/sprint-status.yaml`
  - Agent runbook: `../BE-NexaLab/_bmad-output/planning-artifacts/increment-a-agent-runbook.md`
- Student UX design authority lives in this repository:
  - UX definition: `docs/design/08-STUDENT-P0-UX-DEFINITION.md`
  - Interactive HTML mockup: `docs/design/student-dashboard-p0-mockup.html`
- Do not infer a feature is implemented from a product artifact. Product requirements describe intent, not implementation evidence.

## Seeded test accounts (password set by SEED_PASSWORD / SEED_FIXTURE_PASSWORD in BE-NexaLab/.env)

> [!IMPORTANT]
> Passwords are never written in the repo. Use `SEED_PASSWORD` / `SEED_FIXTURE_PASSWORD` from your local `.env` (ask the owner for the dev values).
> Never seed fixed passwords (especially admin) on a shared database.

| Role | Tài khoản đăng nhập | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | admin@nexalab.local | xem `.env` | `SEED_PASSWORD` |
| Teacher | teacher@nexalab.local | xem `.env` | `SEED_PASSWORD` |
| Teacher owner | teacher.owner@nexalab.local | xem `.env` | `SEED_FIXTURE_PASSWORD`; owns `class-pilot-a` |
| Teacher outsider | teacher.outsider@nexalab.local | xem `.env` | `SEED_FIXTURE_PASSWORD`; owns `class-pilot-b` |
| Parent | parent@nexalab.local | xem `.env` | `SEED_PASSWORD`; linked to `nguyenan.8a` |
| Student | nguyenan.8a | xem `.env` | `SEED_PASSWORD`; enrolled `demo-class` |
| Student temporary | student.temp | xem `.env` | `SEED_FIXTURE_PASSWORD`; `mustChangePassword=true` |
| Student active | student.active | xem `.env` | `SEED_FIXTURE_PASSWORD`; enrolled `class-pilot-a` |
| Student outsider | student.outsider | xem `.env` | `SEED_FIXTURE_PASSWORD`; enrolled `class-pilot-b` only |

Seeded fixtures: `class-pilot-a`, `class-pilot-b`, `demo-class`, `lesson-circuit`, `lesson-eye`, `lesson-chemistry`, `pilot-a-lesson-assignment`.

## Known bugs / open TODOs for future agents

None open. Resolved test bugs, kept for history:

- A1-BUG-001 (`tests/a1-acceptance.cjs` hardcoded teacher-owner password) and A1-BUG-003 (hardcoded ports 4409/5199): fixed in `eb63182`; the script reads `SEED_FIXTURE_PASSWORD ?? SEED_PASSWORD`, `TEST_API` (default `http://127.0.0.1:4000/api`) and `TEST_WEB` (default `http://127.0.0.1:5173`). It also launched a Windows-only Chrome path; it now uses `CHROME_PATH` or the installed Chrome channel.
- A1-BUG-002 (`tests/flagship.spec.ts` used an email login for the student): fixed in `eb63182`; it signs in `nguyenan.8a` through "Tên đăng nhập học sinh" with `SEED_PASSWORD`. Run 2026-10-26: 2 passed, 3 skipped (labs not released to students in the dev database).
