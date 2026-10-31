# K7 — Molecular / gene scene

Catalog members: FL-27 gene-to-protein (private engineering prototype), FL-28 cell division and FL-30 organic molecules (both deferred).
Plan and audit: `../../../../../../BE-NexaLab/_bmad-output/specs/spec-lab-pipeline/fl-27-gene-protein-k7-plan.md`.

```text
molecular/
  kit/            K7 presentation shared by the member Labs; no model, rubric, Outcome or gene data
    MolecularStage.tsx       Canvas host: nucleoplasm backdrop, studio lighting, camera rig, quality tiers, WebGL fallback
    molecules/               DNA duplex (fork/bubble), single strands, enzymes, ribosome, tRNA, polypeptide, ångström ruler
    two-d/                   SequenceDiagram2D, the read-only 2D view (Dual-View "Đọc")
    hud/                     K7Hud, SequenceTrack + BasePicker, CodonTable
    dev/K7KitPreview.tsx     /dev/lab-kits/k7 (DEV build only)
  gene-protein/   FL-27 only: config (PROPOSED_UNAPPROVED), evidence draft, copy, 3D/2D stages, notebook, result
    dev/                     /dev/lab-kits/gene-protein (DEV build only)
```

- K7 is scene-first and does **not** compose `PhysicalLabEnvironment`: a molecular scene is not a practical-room archetype (catalog §6A.6).
- Scene unit = 1 nm. Helix numbers come from the Lab config (SGK values for FL-27); the same numbers drive 3D, ruler and 2D.
- Motion settles on state (damped in `useFrame`, `invalidate()` while moving, reduced motion snaps) and never writes back to evidence.
- The renderer never marks answers; the server recomputes sequences and the rubric once a `gene-expression@1.0.0` model exists.
