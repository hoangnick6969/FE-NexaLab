# NexaLab frontend context

- This repository is the React 18, TypeScript and Vite client for the sibling `nexalab-be` NestJS API. It uses React Router, TanStack Query, Zustand, React Flow, Three.js/React Three Fiber, TipTap and DOMPurify.
- App routes, role-aware pages and authentication UI are in `src/`; API and session handling are in `src/api.ts`; interactive labs are in `src/labs/`; shared UI and responsive styles are in `src/ui.tsx` and `src/styles.css`; Playwright scenarios are in `tests/`.
- Commands: `npm run dev`, `npm run lint`, `npm run build`, and `npm run test:e2e`. E2E requires the configured backend, seed data and Playwright browser. The dev proxy sends `/api` to `http://127.0.0.1:4000`.
- Keep role-specific flows intact: students use teacher-provisioned usernames; teachers, parents and admins use email accounts. Do not treat hidden UI as authorization: API RBAC and server ownership checks remain authoritative.
- The client may preview simulations using the versioned `@nexalab/sim` tarball, but server results are official. Preserve the shared package versioning workflow when changing simulation behavior.
- Product decisions, architecture decisions, and BMAD planning artifacts live in the sibling backend repository:
  - Product requirements: `../nexalab-be/docs/product/prd.md`
  - Architecture Spine: `../nexalab-be/_bmad-output/planning-artifacts/architecture-spine-nexalab-release-1/ARCHITECTURE-SPINE.md`
  - Epic specs and tickets: `../nexalab-be/_bmad-output/specs/`
  - Sprint status: `../nexalab-be/_bmad-output/implementation-artifacts/sprint-status.yaml`
  - Agent runbook: `../nexalab-be/_bmad-output/planning-artifacts/increment-a-agent-runbook.md`
- Student UX design authority lives in this repository:
  - UX definition: `docs/design/08-STUDENT-P0-UX-DEFINITION.md`
  - Interactive HTML mockup: `docs/design/student-dashboard-p0-mockup.html`
- Do not infer a feature is implemented from a product artifact. Product requirements describe intent, not implementation evidence.

## Seeded test accounts (password set by SEED_PASSWORD / SEED_FIXTURE_PASSWORD in nexalab-be/.env)

> [!IMPORTANT]
> All passwords below are the values from `.env` at the time of seeding. Default dev values are shown.
> If the DB was re-seeded with different passwords, update this table accordingly.

| Role | Tài khoản đăng nhập | Mật khẩu mặc định | Ghi chú |
|---|---|---|---|
| Admin | admin@nexalab.local | Fall2026&Spring2027 | `SEED_PASSWORD` |
| Teacher | teacher@nexalab.local | Fall2026&Spring2027 | `SEED_PASSWORD` |
| Teacher owner | teacher.owner@nexalab.local | Fall2026&Spring2027 | `SEED_FIXTURE_PASSWORD`; owns `class-pilot-a` |
| Teacher outsider | teacher.outsider@nexalab.local | Fall2026&Spring2027 | `SEED_FIXTURE_PASSWORD`; owns `class-pilot-b` |
| Parent | parent@nexalab.local | Fall2026&Spring2027 | `SEED_PASSWORD`; linked to `nguyenan.8a` |
| Student | nguyenan.8a | Fall2026&Spring2027 | `SEED_PASSWORD`; enrolled `demo-class` |
| Student temporary | student.temp | Fall2026&Spring2027 | `SEED_FIXTURE_PASSWORD`; `mustChangePassword=true` |
| Student active | student.active | Fall2026&Spring2027 | `SEED_FIXTURE_PASSWORD`; enrolled `class-pilot-a` |
| Student outsider | student.outsider | Fall2026&Spring2027 | `SEED_FIXTURE_PASSWORD`; enrolled `class-pilot-b` only |

Seeded fixtures: `class-pilot-a`, `class-pilot-b`, `demo-class`, `lesson-circuit`, `lesson-eye`, `lesson-chemistry`, `pilot-a-lesson-assignment`.

## Known bugs / open TODOs for future agents

### 🐛 [A1-BUG-001] `tests/a1-acceptance.cjs` hardcode sai password teacher-owner
- **File:** `nexalab-fe/tests/a1-acceptance.cjs` line 9
- **Symptom:** Test login `teacher.owner@nexalab.local` với password `AcceptanceOnly-2026!` → 401 Unauthorized
- **Root cause:** Password hardcode không khớp `SEED_FIXTURE_PASSWORD`. Seed upsert fixture users với `SEED_FIXTURE_PASSWORD` (default `ReplaceFixturePassword123!`), nhưng test script dùng giá trị cũ `AcceptanceOnly-2026!`.
- **Fix cần làm:** Thay `AcceptanceOnly-2026!` ở line 9 bằng `process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD`. **Giao cho dev A1 fix trước khi chạy browser acceptance.**
- **Assign to:** Dev A1

### 🐛 [A1-BUG-002] `tests/flagship.spec.ts` dùng email login cho student
- **File:** `nexalab-fe/tests/flagship.spec.ts` line 6
- **Symptom:** `getByLabel('Email', { exact: true })` không tìm thấy field → timeout 60s
- **Root cause:** Login form của student dùng label `"Tên đăng nhập học sinh"` (username), không phải `"Email"`. Test dùng `student@nexalab.local` (email không tồn tại).
- **Fix cần làm:** Đổi selector sang `getByLabel('Tên đăng nhập học sinh')` và dùng username `nguyenan.8a` với password từ env. **Giao cho dev A1 fix.**
- **Assign to:** Dev A1

### 🔵 [A1-BUG-003] `tests/a1-acceptance.cjs` hardcode port 4409 và 5199
- **File:** `nexalab-fe/tests/a1-acceptance.cjs` lines 4, 22
- **Symptom:** Test connect sai port (dev chạy trên 4000/5173)
- **Fix:** Dùng `process.env.TEST_API ?? 'http://127.0.0.1:4000/api'` và `process.env.TEST_WEB ?? 'http://127.0.0.1:5173'`. **Giao cho dev A1 fix.**
- **Assign to:** Dev A1

