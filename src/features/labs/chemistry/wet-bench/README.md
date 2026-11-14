# K2 — Wet chemistry bench

Planned portfolio group: FL-10–FL-15. Each Lab keeps its own scientific model, reaction data, state, safety framing, activity and rubric.

## Shared room and K2 apparatus

- The 3D scene composes `../../shared/PhysicalLabEnvironment.tsx` for the room shell: tiled floor, walls, sink, cabinets, brown worktable and base lighting. Other physical-scene kits reuse this environment instead of rebuilding it.
- `WetBenchStage.tsx` contains FL-10 apparatus: the electronic balance and two beakers. It does not add a reagent shelf, stock bottles, graduated cylinder, wash bottle or test-tube rack because this activity does not need them. FL-11–15 apparatus are not implemented; K2 remains pre-production.
- Both beakers start on the balance in 2D and 3D. The display stays hidden until the server confirms `READ_BEFORE` or `READ_AFTER`; pouring returns the empty beaker to the balance before the second reading.
- Future K2 activities add only the apparatus their reviewed experiment requires. Props do not become part of the shared room or appear in another kit by default.
- `LabSpace` is the fullscreen product shell. It is separate from the reusable 3D room and from the K2 apparatus.

## FL-10 candidate boundary

FL-10 uses this scene with `MassConservationActivity` for one activity: conservation of mass in the BaCl₂ + Na₂SO₄ precipitation reaction. It does not cover the full FL-10 scope such as mole calculations, limiting reactants or balancing general equations. The shared database has Mass Conservation release v1 active as of 2026-11-01 with a historical `OWNER_SIGNOFF_V1` receipt. New drafts use `DEV_APPROVAL_V1` after developer/agent checks in Admin. This released activity does not complete the full FL-10 portfolio scope.

Both solutions are colorless in reality. The vessels use high-contrast labels and a safety warning for soluble barium; the white BaSO₄ precipitate is a model visualization.

## Explore kit (pilot, 2026-11-13)

`kit/` is the Explore-first K2 bench: Stage 1 intro & safety (`shared/LabIntroOverlay`), Stage 2 free workbench, Stage 3 optional prompts (`shared/ObservationDrawer`). It is unscored and client-only: no LabRun, attempt or evidence. The guided FL-10 activity above (`MassConservationActivity`, `WetBenchStage`) is unchanged.

- Chemistry lives in `@nexalab/sim/wet-bench` (species, reagents, `k2-reactions@1`, pH solver, engine). FL-13 data and golden tests: `fl13-acid-base.data.ts`, `fl13-acid-base.golden.test.ts` in `BE-NexaLab/packages/sim/wet-bench/`. All of it is an unreviewed technical draft.
- Interaction: snap-to-zone drag in 3D, or click a bottle/tool/vessel then click the target, or the same with the keyboard through the HUD buttons (`Esc` drops what is held, `Ctrl+Z` undoes). All paths dispatch the same reducer actions (`kit/bench-reducer.ts`).
- A pair of substances not covered by an allowed reaction, the acid–base solver or a reviewed inert pair is rejected as out of scope; the vessel keeps its last valid state.
- Observation log: IndexedDB (`nexalab-k2-observation-log`), `exportObservationLog()` returns `k2-observation-log/1` JSON for a future Class Lab endpoint.
- Adding a Lab: one `labs/*.config.ts` (`ChemistryLabConfig`) registered in `labs/index.ts`. No new component is needed unless the Lab needs a new kind of apparatus; new chemistry needs a `k2-reactions` entry, golden tests and review.
- Dev route: `/dev/lab-kits/k2?lab=fl-13|fl-14a|fl-10`.
- Main route: `/labs/acid-base-indicators` (FL-13) and `/labs/metal-reactivity` (FL-14a) open the kit through `Lab.tsx` → `runtime/explore-labs.ts` → `kit/ExploreLabPage.tsx`. Only Explore-only configs route here; FL-10 keeps its guided LabRun flow. The page prefers `Lab.config.explore` from `GET /labs` when it validates, else the bundled config.
- Database rows: `BE-NexaLab/scripts/seed-k2-explore-labs.ts` (`npm run db:seed:k2-explore`, `--dry-run`, `--unpublish`). Writing to a non-loopback database needs `K2_EXPLORE_SHARED_WRITE_APPROVED`.
