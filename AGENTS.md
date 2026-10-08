# NexaLab frontend context

- This repository is the React 18, TypeScript and Vite client for the sibling `nexalab-be` NestJS API. It uses React Router, TanStack Query, Zustand, React Flow, Three.js/React Three Fiber, TipTap and DOMPurify.
- App routes, role-aware pages and authentication UI are in `src/`; API and session handling are in `src/api.ts`; interactive labs are in `src/labs/`; shared UI and responsive styles are in `src/ui.tsx` and `src/styles.css`; Playwright scenarios are in `tests/`.
- Commands: `npm run dev`, `npm run lint`, `npm run build`, and `npm run test:e2e`. E2E requires the configured backend, seed data and Playwright browser. The dev proxy sends `/api` to `http://127.0.0.1:4000`.
- Keep role-specific flows intact: students use teacher-provisioned usernames; teachers, parents and admins use email accounts. Do not treat hidden UI as authorization: API RBAC and server ownership checks remain authoritative.
- The client may preview simulations using the versioned `@nexalab/sim` tarball, but server results are official. Preserve the shared package versioning workflow when changing simulation behavior.
- Product decisions are shared with the backend repository in `../nexalab-be/docs/product/`; this repository contains a pointer at `docs/product/README.md`. Do not infer a feature is implemented from a product artifact.
