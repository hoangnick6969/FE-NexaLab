# Lab frontend layout

The catalog is the source of truth for Lab IDs and shared-kit membership:
`../../../../BE-NexaLab/_bmad-output/specs/spec-lab-pipeline/lab-catalog-and-shared-kits-khtn8-9.md` §6A.3 and §6A.6.
The 20 entries below are provisional implementation slots, not approved releases.

## Implemented code groups

```text
labs/
  Lab.tsx, LabLibrary.tsx        route and discovery entry points
  shared/                        fullscreen Lab Space and view selector
                                 shared physical room: floor, sink, cabinets, brown worktable
  runtime/                       launch-bound run host
  pathways/                      assigned lesson/pathway integration
  physics/
    shared/                      Canvas lifecycle, camera, WebGL fallback
    electricity/                 K1: FL-01 code; induction/ = FL-25 private prototype
    fluid/                        K3: FL-03–05 (planned)
    thermal/                      K4: FL-07–08 (planned)
    mechanics/                    K5: FL-06/24 (planned)
    optics/                       K6: FL-23 (planned)
  chemistry/                     chemistry compatibility fixture renderer
    wet-bench/                    K2: FL-10 candidate; FL-11–15 planned
  biology/anatomy/               existing Eye learning resource (FL-16 is NO LAB)
  biology/ecology/                K8: FL-20 tolerance (built, not released); FL-21 planned
  biology/genetics/               K8: FL-26 (planned)
  biology/molecular/              K7: FL-27 (planned)
```

- `shared/PhysicalLabEnvironment.tsx` owns the common physical room shell (tiled floor, walls, sink, cabinets and brown worktable). K1 and the FL-10/K2 candidate both use it; kit-specific apparatus stays in its own folder. This source reuse avoids duplicate room geometry definitions; device-level memory and frame-time still require measurement.
- Treat `PhysicalLabEnvironment.tsx` as a cross-kit contract. A kit task must compose it without adding kit-specific props or geometry there. Room-wide changes require checking all current consumers (K1 Circuit and K2 FL-10) and updating this contract; kit apparatus stays in its kit directory. FL-10 uses only its balance and two beakers; it does not add a reagent shelf or test-tube rack.
- `physics/shared/PhysicsStage.tsx` owns the K1 Canvas lifecycle, responsive camera and WebGL fallback. `LabSpace` remains the fullscreen UI shell, separate from the 3D room environment.
- `physics/electricity/` contains the Circuit bulb and topology views. `Circuit2DEditor.tsx` preserves the original React Flow editor from the pre-Lab-Space `Circuit.tsx`; `Circuit.tsx` selects it or the shared-room 3D apparatus. Both map to the FL-01 candidate family. induction/ contains the FL-25 private engineering prototype; it uses the same room shell.
- `shared/` is presentation shell/UI shared across disciplines; it does not contain scientific models or scoring.
- `chemistry/Chemistry.tsx` remains `TECHNICAL_FIXTURE_ONLY`; it is not one of the approved/provisional released Lab experiences.
- `biology/anatomy/` contains a Lesson resource, not a Foundational Lab implementation.

## Provisional 20-slot grouping and code destination

| Kit/apparatus family | Catalog IDs | Code folder | Current FE evidence |
|---|---|---|---|
| K1 Electricity and magnetism | FL-01, FL-25 | `physics/electricity/` | FL-01 Circuit; FL-25 private prototype in `induction/` (not released) |
| K3 Fluids | FL-03, FL-04, FL-05 | `physics/fluid/` | Shared kit and FL-03 density 2D/3D renderer with server-pinned specimens; FL-04 and FL-05 not implemented |
| K4 Thermal bench | FL-07, FL-08 | `physics/thermal/` | Not implemented |
| K5 Mechanics | FL-06, FL-24 | `physics/mechanics/` | Not implemented |
| K2 Wet chemistry | FL-10–FL-15 | `chemistry/wet-bench/` | K2 candidate bench active for FL-10 Mass Conservation candidate activity; FL-11–15 apparatus not implemented; K2 remains pre-production |
| K8 Ecology HUD | FL-20, FL-21 | `biology/ecology/` | FL-20 built (2D, not released); FL-21 not implemented |
| K6 Optics | FL-23 | `physics/optics/` | Not implemented |
| K8 Genetics HUD | FL-26 | `biology/genetics/` | Not implemented |
| K7 Molecular / gene-to-protein scene | FL-27 | `biology/molecular/` | Not implemented |

The kit folders without Lab components currently contain only a short README with member IDs and the intended reuse boundary. Add code when an implementation begins; do not put a Lab in a group just because it can reuse the room shell. Reuse the physical room across physical-scene kits, and keep each Lab's apparatus, model, activity, rubric and identity separate.
