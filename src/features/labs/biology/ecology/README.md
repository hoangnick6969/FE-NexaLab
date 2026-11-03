# K8 — Ecology light scene + HUD

Portfolio group: FL-20 tolerance/ecology (released v1), FL-21 food web; FL-26 and FL-29 may reuse the stage later.

```text
ecology/
  kit/            K8 presentation shared by member Labs; no model, rubric, Outcome or species data
    EcoStage.tsx          Canvas host: daylight (light/dark), quality tiers, off-centre framing around the Lab overlays, 2D fallback
    PondDiorama3D.tsx     cut-open pond: banks with soil layers, muddy floor and pebbles, weeds, caustics, water pane and rippling surface,
                          lily pads, steam on hot water and frost on cold water (both follow the temperature only)
    FishSchool3D.tsx      procedural cá rô phi (fish-geometry.ts), one instanced draw, tail bend in a vertex shader
    Thermometer3D.tsx     glass thermometer with a 0–50 °C column and scale plate
    eco-quality.ts / eco-palette.ts / eco-motion.ts   tiers, colours, motion tokens
    procedural.ts         seeded random and vertex-colour painting shared by the pond and the fish
    dev/K8KitPreview.tsx  /dev/lab-kits/k8 (DEV build only, own K8KitPreview.css)
  tolerance/      FL-20 `ecology-tolerance` renderer: PondView3D (default) or the 2D PondScene, tolerance graph card,
                  comparison of three hypothetical fish, density plot with SGK table 42.1, age pyramid
```

- FL-20 v1.1 (2026-11-03) replaces the flat pond with the K8 diorama; spec `BE-NexaLab/_bmad-output/specs/spec-fl-20-ecological-tolerance/k8-ecostage-v1.1.md`. Model, activity, rubric and release v1 are unchanged.
- Everything is built in code: no GLB, no downloaded textures or HDR, so there is no asset licence to track.
- The renderer never decides an answer. Fish mood comes from the activity (`hidden` → neutral grey and still, `persists` → swimming, `gone` → heat or cold stress: crowding the surface then sinking when hot, slowing and sinking pale when cold, never belly-up); before a prediction is checked the fish never hint at the result. Water tint, steam and frost follow the temperature, not the outcome.
- The canvas is `aria-hidden`; the wrapper `.eco-pond` keeps `role="img"`, the label with the temperature and the `data-fish` contract of the 2D scene.
- Tiers: high (shadows, 9 fish, DPR ≤ 2), mid (no shadows, 7 fish), low (no caustics, 5 fish, DPR 1). `PerformanceMonitor` steps down. Reduced motion: still fish and water, on-demand frames.
- The learner can orbit within limits and zoom; no pan. "Xem sơ đồ 2D" switches to the SVG scene (kept per browser); without WebGL the 2D scene is the only view.
