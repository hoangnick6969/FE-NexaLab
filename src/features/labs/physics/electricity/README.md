# K1 — Electricity and magnetism

Provisional portfolio group: FL-01 and FL-25. The root files implement the FL-01 Circuit bulb/topology family.

`induction/` implements FL-25 electromagnetic induction with its own model (`em-induction@1.0.0`), activity and apparatus. It shares the K1 room (`../shared/PhysicsStage.tsx`) and the `Wire` cable component. The shared database has FL-25 release v1 active as of 2026-11-01 with a historical `OWNER_SIGNOFF_V1` receipt. New release drafts use `DEV_APPROVAL_V1` after developer/agent checks in Admin. KHTN 9 outcome provenance and representative-device QA remain open. Plan and blueprint: `BE-NexaLab/_bmad-output/specs/spec-fl-25-em-induction/`.

- `em-evidence.ts`: checkpoint evidence, phase machine and the advisory `@nexalab/sim` preview.
- `choreography.ts`: presentation timing shared by the 3D and 2D views; the current sign always comes from the model observation.
- `EmInduction3DStage.tsx` + `apparatus/`: procedural coil, bar magnet with illustrative field lines, zero-centre galvanometer, inverse-parallel LEDs and crank generator. No GLB, HDR or network font.
- `EmInduction2DView.tsx`: equivalent SVG schematic and WebGL-free path.
- `EmInductionActivity.tsx`: question panel and action dock. Free explore (flip the pole, open the circuit, push/pull/hold, turn the generator either way) unlocks only after all four checkpoints are observed; it is local view state, never in the draft or the submission, and its result is the pinned model preview labelled as not scored.
- `manual.ts` + `apparatus/drag.ts`: direct manipulation. Students drag the magnet along the rail or turn the crank (3D and 2D); a full stroke or turn records the checkpoint, the current sign still comes from the model. The buttons remain for keyboard and assistive technology.
- Tests: `tests/em-induction-lab.spec.ts` (route-mocked) and `tests/em-induction-real-stack.spec.ts` (opt-in with `FL25_REAL_STACK=1`, real API on an isolated local database only).
