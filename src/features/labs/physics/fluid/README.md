# K3 — Fluid bench

Portfolio group: FL-03 density, FL-04 fluid/atmospheric pressure, FL-05 Archimedes.
Plan: `../../../../../../BE-NexaLab/_bmad-output/specs/spec-lab-pipeline/fl-03-density-k3-plan.md`.

```text
fluid/
  kit/                 shared K3 presentation (no model, rubric or Outcome)
    k3-config.ts       Zod schema for the pack template: instruments, materials, specimens, tolerances
    k3-geometry.ts     mm scale, volume → liquid height, graduations, reading format, decimal parsing
    k3-motion.ts       motion timings and reduced-motion hook
    FluidBench3D.tsx   shared room with studio lighting, on-demand frames, mm bench group and slots
    apparatus/         DigitalBalance3D, GraduatedCylinder3D, Specimen3D (procedural, no downloaded assets)
    two-d/             Balance2D, Cylinder2D (same geometry as 3D)
    hud/               K3Hud guide frame + k3.css tokens
    dev/               K3KitPreview, served only by the dev server at /dev/lab-kits/k3
  density/             FL-03 only: sample config (PROPOSED_UNAPPROVED); activity comes in Phase 4
```

Rules: apparatus receive readings and volumes from the pinned run and only animate towards them; the server
recomputes every observation and score. FL-04/05 reuse the kit without importing FL-03 state or rubric.
No FL-03 Lab renderer is registered yet; that waits for the P3.5 gate (plan §10).
