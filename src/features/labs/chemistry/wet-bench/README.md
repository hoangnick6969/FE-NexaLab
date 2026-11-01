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
