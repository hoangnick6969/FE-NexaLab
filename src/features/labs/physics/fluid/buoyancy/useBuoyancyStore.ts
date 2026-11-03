import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { createStore, useStore } from "zustand";
import type { BuoyancyPresentation, BuoyancyEvidence } from "./BuoyancyEvidence";
import { dampedSpringStep, usePrefersReducedMotion } from "../kit/k3-motion";
export type BuoyancyStep = "air" | "partial" | "full" | "verify";
type State = {
  hoistHeight: number; targetHoistHeight: number; records: Array<{ specimenId: string; weightN: number; springN: number; buoyantN: number; volumeMl: number }>;
  setHoistHeight: (value: number) => void; advanceHoist: (value: number) => void; recordReading: () => void;
  config: BuoyancyPresentation; specimenId: string; specimenY: number; submergedVolumeMl: number; springForceN: number; overflowMl: number;
  step: BuoyancyStep; mode: "2d" | "3d";
  selectSpecimen: (id: string) => void; setStep: (step: BuoyancyStep) => void; setMode: (mode: "2d" | "3d") => void;
};
function createBuoyancyStore(config: BuoyancyPresentation, evidence: BuoyancyEvidence) {
  const readings = (id: string, hoist: number) => {
    const item = [...config.specimens, ...EXPLORATION_SPECIMENS].find((sample) => sample.id === id);
    if (!item) throw new Error("Specimen is not in the pinned pack");
    const fraction = Math.min(1, Math.max(0, (hoist - .3) / .45));
    const submergedVolumeMl = item.volumeMl * fraction;
    const height = id === "pebble-a" ? 22 : 25;
    const specimenY = hoist <= .3 ? 90 + 35 * (1 - hoist / .3) : hoist <= .75 ? 90 - height * fraction : 90 - height - 12 * ((hoist - .75) / .25);
    return { specimenY, submergedVolumeMl,
      springForceN: Math.max(0, item.massG / 1000 * config.gravity - config.fluidDensityKgM3 * config.gravity * submergedVolumeMl / 1e6), overflowMl: submergedVolumeMl };
  };
  const specimenId = config.specimens.some((item) => item.id === evidence.specimenId) ? evidence.specimenId : config.specimens[0].id;
  const selected = config.specimens.find((item) => item.id === specimenId)!;
  const step = evidence.submergedVolumeMl <= 0 ? "air" : evidence.submergedVolumeMl < selected.volumeMl ? "partial" : "full";
  const initialHoist = step === "air" ? 0 : step === "partial" ? .525 : .8;
  return createStore<State>((set, get) => ({ config, specimenId, step, records: [], hoistHeight: initialHoist, targetHoistHeight: initialHoist, mode: "3d", ...readings(specimenId, initialHoist),
    selectSpecimen: (id) => set({ specimenId: id, step: "air", hoistHeight: 0, targetHoistHeight: 0, ...readings(id, 0) }),
    setHoistHeight: (value) => set({ targetHoistHeight: Math.max(0, Math.min(1, value)) }),
    advanceHoist: (value) => set((current) => { const next = readings(current.specimenId, value); return { hoistHeight: value, ...next, overflowMl: Math.max(current.overflowMl, next.overflowMl), step: value < .3 ? "air" : value < .75 ? "partial" : "full" }; }),
    recordReading: () => { const current = get(); const specimen = [...config.specimens, ...EXPLORATION_SPECIMENS].find(item => item.id === current.specimenId)!; set({ records: [...current.records, { specimenId: current.specimenId, weightN: specimen.massG / 1000 * config.gravity, springN: current.springForceN, buoyantN: config.fluidDensityKgM3 * config.gravity * current.submergedVolumeMl / 1e6, volumeMl: current.overflowMl }] }); },
    setStep: (next) => { get().setHoistHeight(next === "air" ? 0 : next === "partial" ? .525 : .8); set({ step: next }); },
    setMode: (mode) => set({ mode }),
  }));
}
export const EXPLORATION_SPECIMENS = [
  { id: "explore-aluminium", label: "Nhôm", massG: 27, volumeMl: 10, color: "#cbd5e1", metalness: .9 },
  { id: "explore-copper", label: "Đồng", massG: 89, volumeMl: 10, color: "#b87333", metalness: .85 },
  { id: "explore-wood", label: "Gỗ", massG: 6, volumeMl: 10, color: "#b88855", metalness: 0 },
];
const Context = createContext<ReturnType<typeof createBuoyancyStore> | null>(null);
export function BuoyancyStoreProvider({ config, evidence, children }: { config: BuoyancyPresentation; evidence: BuoyancyEvidence; children: ReactNode }) {
  const [store] = useState(() => createBuoyancyStore(config, evidence));
  const reduced = usePrefersReducedMotion();
  // The physical clock belongs to the activity, not Canvas: 2D and WebGL fallback remain fully interactive.
  useEffect(() => {
    let raf = 0, velocity = 0, previous = 0;
    const tick = (now: number) => {
      raf = 0;
      const current = store.getState();
      const sample = [...current.config.specimens, ...EXPLORATION_SPECIMENS].find(item => item.id === current.specimenId)!;
      const dt = previous ? Math.min((now - previous) / 1000, .1) : 1 / 60; previous = now;
      const next = dampedSpringStep(current.hoistHeight, velocity, current.targetHoistHeight, dt, { stiffness: 110, damping: 21, massKg: 1 + sample.massG / 1000 });
      velocity = next.velocity;
      const settled = Math.abs(next.position - current.targetHoistHeight) < .0001 && Math.abs(velocity) < .001;
      current.advanceHoist(settled || reduced ? current.targetHoistHeight : Math.max(0, Math.min(1, next.position)));
      if (!settled && !reduced) raf = requestAnimationFrame(tick); else { previous = 0; velocity = 0; }
    };
    const unsubscribe = store.subscribe((next, previousState) => {
      if (next.specimenId !== previousState.specimenId) { velocity = 0; previous = 0; }
      if (next.targetHoistHeight !== previousState.targetHoistHeight && !raf) raf = requestAnimationFrame(tick);
    });
    return () => { unsubscribe(); cancelAnimationFrame(raf); };
  }, [store, reduced]);
  return createElement(Context.Provider, { value: store }, children);
}
export function useBuoyancyStore() {
  const store = useContext(Context);
  if (!store) throw new Error("BuoyancyStoreProvider is required");
  return useStore(store);
}
