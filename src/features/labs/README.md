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
    electricity/                 K1: FL-01 code; induction/ = FL-25 scene
    fluid/                        K3: FL-03–05 (planned)
    thermal/                      K4: FL-07–08 (planned)
    mechanics/                    K5: FL-06/24 (planned)
    optics/                       K6: FL-23 (planned)
  chemistry/                     chemistry compatibility fixture renderer
    wet-bench/                    K2: FL-10 candidate; FL-11–15 planned
  biology/anatomy/               EX-A kit (FL-16 LAB, FL-17 later): kit/ shared studio, lab room entry (EyeLabRoom), camera focus, callouts, sagittal section;
                                 eye-optics/ = FL-16 activity (rubric eye-anatomy-optics@1.0.0); Eye.tsx = legacy eye@1.0.0 resource
  biology/ecology/                K8: shared 3D pond kit; FL-20 tolerance (released v1, 3D diorama since v1.1); FL-21 food web
  biology/genetics/               K8: FL-26 (planned)
  biology/molecular/              K7: kit/ (bench entry + molecular scene) + gene-protein/ = FL-27 technical candidate
```

- `shared/PhysicalLabEnvironment.tsx` owns the common physical room shell (tiled floor, walls, sink, cabinets and brown worktable). K1 and the FL-10/K2 candidate both use it; kit-specific apparatus stays in its own folder. This source reuse avoids duplicate room geometry definitions; device-level memory and frame-time still require measurement.
- Treat `PhysicalLabEnvironment.tsx` as a cross-kit contract. A kit task must compose it without adding kit-specific props or geometry there. Room-wide changes require checking all current consumers (K1 Circuit, K2 FL-10, K3 FL-03, the K7 FL-27 bench and the EX-A FL-16 room) and updating this contract; kit apparatus stays in its kit directory. FL-10 uses only its balance and two beakers; it does not add a reagent shelf or test-tube rack.
- `physics/shared/PhysicsStage.tsx` owns the K1 Canvas lifecycle, responsive camera and WebGL fallback. `LabSpace` remains the fullscreen UI shell, separate from the 3D room environment.
- `physics/electricity/` contains the Circuit bulb and topology views. `Circuit2DEditor.tsx` preserves the original React Flow editor from the pre-Lab-Space `Circuit.tsx`; `Circuit.tsx` selects it or the shared-room 3D apparatus. Both map to the FL-01 candidate family. `induction/` contains the FL-25 scene and uses the same room shell; release availability is controlled by the backend catalog.
- `shared/` is presentation shell/UI shared across disciplines; it does not contain scientific models or scoring.
- `chemistry/Chemistry.tsx` remains `TECHNICAL_FIXTURE_ONLY`; it is not one of the approved/provisional released Lab experiences.
- `biology/anatomy/Eye.tsx` is the legacy Lesson resource. FL-16 (`eye-optics/`) opens in the shared room scaled 3× around the enlarged eye model, full screen behind a floating guide panel as FL-27 does (`kit/EyeLabRoom.tsx`: stand, acuity chart, trial lens case); clicking the model or its DOM button flies the camera in to the section, as the K7 microscope does.

## Provisional 20-slot grouping and code destination

| Kit/apparatus family | Catalog IDs | Code folder | Current FE evidence |
|---|---|---|---|
| K1 Electricity and magnetism | FL-01, FL-25 | `physics/electricity/` | FL-01 Circuit; FL-25 private prototype in `induction/` (not released) |
| K3 Fluids | FL-03, FL-04, FL-05 | `physics/fluid/` | Shared kit and FL-03 density 2D/3D renderer with server-pinned specimens; FL-04 and FL-05 not implemented |
| K4 Thermal bench | FL-07, FL-08 | `physics/thermal/` | FL-07 run-bound 2D/3D technical candidate; FL-08 not implemented |
| K5 Mechanics | FL-06, FL-24 | `physics/mechanics/` | Not implemented |
| K2 Wet chemistry | FL-10–FL-15 | `chemistry/wet-bench/` | K2 candidate bench active for FL-10 Mass Conservation candidate activity; FL-11–15 apparatus not implemented; K2 remains pre-production |
| K8 Ecology light scene + HUD | FL-20, FL-21 | `biology/ecology/` | K8 kit (`kit/`: EcoStage, pond diorama, instanced fish, thermometer; preview `/dev/lab-kits/k8`). FL-20 released v1, renderer v1.1 uses the 3D diorama with the 2D scene as option and fallback; FL-21 on its own branch |
| K6 Optics | FL-23 | `physics/optics/` | Not implemented |
| K8 Genetics HUD | FL-26 | `biology/genetics/` | Not implemented |
| K7 Molecular / gene-to-protein scene | FL-27 (FL-28, FL-30 deferred) | `biology/molecular/` | Technical candidate: K7 kit (bench entry in the shared room with microscope, PCR machine and tube rack → `MolecularStage` without a room; schematic and ball-and-stick views; 2D read view) and FL-27 (`gene-protein/`) running through the lab run host against BE `gene-expression@1.0.0` / `gene-protein-stations@1.0.0`. Not released; previews `/dev/lab-kits/k7`, `/dev/lab-kits/gene-protein` |

## Catalog scene thumbnails

FL-07 uses the production `ThermalBench3D` at the 50 s observation in the shared capture harness. Refresh with `npm run capture:lab-thumbnails -- thermal-energy`. Its 1280×720 WebP is discovered automatically by the exact Lab ID and is excluded from release digests.

The catalog uses static WebP captures from the corresponding 3D stage; cards never mount WebGL. The images load lazily and the existing icon art remains the fallback if no matching image exists or an image fails to load. Vite discovers all `assets/thumbnails/<lab-id>.webp` files automatically, so adding an image with the same ID as a `labInfo` entry wires it into the card without editing image imports.

### Add or refresh a Lab thumbnail

1. Add a fixture to `dev/lab-thumbnail-capture.tsx`, keyed by the exact Lab ID. Render the production 3D stage with a deterministic, representative state and no user/run data. Set a capture-only camera override there if the default composition does not fit a catalog card; do not alter the live Lab camera just for the thumbnail.
2. Run `npm run capture:lab-thumbnails` to capture all registered scenes, or `npm run capture:lab-thumbnails -- <lab-id>` to capture only one. The script starts and stops a local Vite server, blocks `/api/**`, exports 1280×720 WebP files under 120 KiB, and writes only the selected thumbnail asset(s). It requires the installed Playwright Chrome channel; set `CHROME_PATH` if using a specific Chrome executable.
3. Review the generated image and commit it with the fixture. If refreshing only one Lab, use its exact ID so other image files are left untouched.

For an already-running capture page, set `THUMBNAIL_CAPTURE_URL` to its local `/tools/lab-thumbnail-capture/index.html` URL; the script then uses that server rather than starting another. Never capture a signed-in runtime page or use real student data.

### FL-06 (`lever-equilibrium`)

- Fixture: `dev/lab-thumbnail-capture.tsx` renders `K5Stage3D` in a deterministic balanced state with two hanging weights. The close framing belongs only to the capture fixture; it does not change the activity camera.
- Output: `assets/thumbnails/lever-equilibrium.webp`, 1280×720 WebP under 120 KiB. `lab-info.ts` discovers it automatically by the exact Lab ID.
- To refresh after changing the K5 scene: `npm run capture:lab-thumbnails -- lever-equilibrium`; inspect the resulting image and confirm the bar, O pivot, position labels, support and both hanging weights are visible. Capture runs against production stage components with `/api/**` blocked and does not create LabRuns, events, or database writes.

### FL-16 (`eye-optics`)
- Fixture: `dev/lab-thumbnail-capture.tsx` renders the EX-A `AnatomyStage` with the sectioned `EyeModel` (normal eye, lens 20 D) and the ray fan focused on the retina. The framing belongs only to the fixture.
- Output: `assets/thumbnails/eye-optics.webp`. Refresh with `npm run capture:lab-thumbnails -- eye-optics` after changing the eye model.

The kit folders without Lab components currently contain only a short README with member IDs and the intended reuse boundary. Add code when an implementation begins; do not put a Lab in a group just because it can reuse the room shell. Reuse the physical room across physical-scene kits, and keep each Lab's apparatus, model, activity, rubric and identity separate.
