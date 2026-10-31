# K7 — Molecular / gene scene

Catalog members: FL-27 gene-to-protein (private engineering prototype), FL-28 cell division and FL-30 organic molecules (both deferred).
Plan and audit: `../../../../../../BE-NexaLab/_bmad-output/specs/spec-lab-pipeline/fl-27-gene-protein-k7-plan.md`.

```text
molecular/
  kit/            K7 presentation shared by the member Labs; no model, rubric, Outcome or gene data
    MolecularStage.tsx       Canvas host: nucleoplasm backdrop, studio lighting, camera rig, quality tiers, WebGL fallback
    molecules/               DNA duplex (fork/bubble; schematic or ball-and-stick), single strands, free-nucleotide pool,
                             enzymes, ribosome, tRNA, polypeptide, ångström ruler
    two-d/                   SequenceDiagram2D, the read-only 2D view (Dual-View "Đọc")
    hud/                     K7Hud, SequenceTrack + BasePicker, CodonTable
    bench/                   lab-room entry: Microscope3D (the doorway), Thermocycler3D, TubeRack3D, GeneLabBench3D
    dev/K7KitPreview.tsx     /dev/lab-kits/k7 (DEV build only)
  gene-protein/   FL-27 only: config (PROPOSED_UNAPPROVED), evidence draft, copy, 3D/2D stages, notebook, result
    dev/                     /dev/lab-kits/gene-protein (DEV build only)
```

- 3D opens at a molecular-biology bench in the shared `PhysicalLabEnvironment` (owner decision 2026-10-31, after the PraxiLabs-style reference). K7 apparatus lives in `kit/bench/` and the room shell is not changed. Clicking the microscope (or its DOM button) zooms into the eyepiece and opens `MolecularStage`, which has no room: molecules float in a nucleoplasm backdrop.
- Scene unit = 1 nm. Helix numbers come from the Lab config (SGK values for FL-27); the same numbers drive 3D, ruler and 2D.
- Motion settles on state (damped in `useFrame`, `invalidate()` while moving, reduced motion snaps) and never writes back to evidence.
- The renderer never marks answers; the server recomputes sequences and the rubric once a `gene-expression@1.0.0` model exists.
- Two looks for the duplex: the schematic model (glossy sugar–phosphate tube with beads, pentagon sugars, coloured base rods) and an illustrative ball-and-stick model (CPK colours, green backbone ribbon, `atom-renderer.ts`). Both share the same poses, so hydrogen bonds and animation line up; neither is crystallographic.
- `NucleotidePool3D` drifts free nucleotides around stations that build a strand. It needs continuous frames, so it is off in reduced motion and on the low tier.
