# Lab frontend layout

The catalog is the source of truth for Lab IDs and shared-kit membership:
`../../../../nexalab-be/_bmad-output/specs/spec-lab-pipeline/lab-catalog-and-shared-kits-khtn8-9.md` §6A.3 and §6A.6.
The 20 entries below are provisional implementation slots, not approved releases.

## Implemented code groups

```text
labs/
  Lab.tsx, LabLibrary.tsx        route and discovery entry points
  shared/                        fullscreen Lab Space and view selector
  runtime/                       launch-bound run host
  pathways/                      assigned lesson/pathway integration
  physics/
    shared/                      reusable physics room/stage
    electricity/                 K1: FL-01 code; FL-25 reserved, not implemented
    fluid/                        K3: FL-03–05 (planned)
    thermal/                      K4: FL-07–08 (planned)
    mechanics/                    K5: FL-06/24 (planned)
    optics/                       K6: FL-23 (planned)
  chemistry/                     chemistry compatibility fixture renderer
    wet-bench/                    K2: FL-10–15 (planned)
  biology/anatomy/               existing Eye learning resource (FL-16 is NO LAB)
  biology/ecology/                K8: FL-20/21 (planned)
  biology/genetics/               K8: FL-26 (planned)
  biology/molecular/              K7: FL-27 (planned)
```

- `physics/shared/PhysicsStage.tsx` owns the shared procedural physics room, Canvas lifecycle, camera and WebGL fallback. Kit-specific apparatus stays under its physics environment folder.
- `physics/electricity/` contains the Circuit bulb and topology views. `Circuit2DEditor.tsx` preserves the original React Flow editor from the pre-Lab-Space `Circuit.tsx`; `Circuit.tsx` selects it or the shared-room 3D apparatus. Both map to the FL-01 candidate family. This does not implement FL-25.
- `shared/` is presentation shell/UI shared across disciplines; it does not contain scientific models or scoring.
- `chemistry/Chemistry.tsx` remains `TECHNICAL_FIXTURE_ONLY`; it is not one of the approved/provisional released Lab experiences.
- `biology/anatomy/` contains a Lesson resource, not a Foundational Lab implementation.

## Provisional 20-slot grouping and code destination

| Shared environment / discipline | Catalog IDs | Code folder | Current FE evidence |
|---|---|---|---|
| K1 Electricity and magnetism | FL-01, FL-25 | `physics/electricity/` | FL-01 Circuit only; FL-25 is not implemented |
| K3 Fluids | FL-03, FL-04, FL-05 | `physics/fluid/` | Not implemented |
| K4 Thermal bench | FL-07, FL-08 | `physics/thermal/` | Not implemented |
| K5 Mechanics | FL-06, FL-24 | `physics/mechanics/` | Not implemented |
| K2 Wet chemistry | FL-10–FL-15 | `chemistry/wet-bench/` | Catalog candidates not implemented; current chemistry fixture is excluded |
| K8 Ecology HUD | FL-20, FL-21 | `biology/ecology/` | Not implemented |
| K6 Optics | FL-23 | `physics/optics/` | Not implemented |
| K8 Genetics HUD | FL-26 | `biology/genetics/` | Not implemented |
| K7 Molecular / gene-to-protein scene | FL-27 | `biology/molecular/` | Not implemented |

The kit folders without Lab components currently contain only a short README with member IDs and the intended reuse boundary. Add code when an implementation begins; do not put a Lab in a group just because it can reuse the room shell. Keep each Lab's model, activity, rubric and identity separate while reusing environment components within the kit.
