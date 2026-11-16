import { createElement, type ComponentType, type ReactNode } from "react";
import { FL04_PRESSURE_EXPLORE_CONFIG as pressure } from "@nexalab/sim/fluid";
import { evaluateConduction, evaluateConvection, FL08_HEAT_TRANSFER_EXPLORE_CONFIG as thermal } from "@nexalab/sim/thermal";
import { FL23_REFRACTION_EXPLORE_CONFIG as optics } from "@nexalab/sim/optics";
import { FL23_LENS_EXPLORE_CONFIG as lens } from "@nexalab/sim/optics/lens";
import { FL24_ENERGY_EXPLORE_CONFIG as energy } from "@nexalab/sim/mechanics/energy";
import { readProbe, readPistons } from "../physics/fluid/pressure/FluidExploreBench";
import { APPARATUS_RENDERERS as pressureRenderers, type FluidStageState } from "../physics/fluid/pressure/PressureStage3D";
import { APPARATUS_RENDERERS as thermalRenderers, type ThermalStageState } from "../physics/thermal/transfer/ThermalStage3D";
import { readRay, readPrism } from "../physics/optics/refraction/RefractionExploreBench";
import { APPARATUS_RENDERERS as opticsRenderers, type RefractionStageState } from "../physics/optics/refraction/RefractionStage3D";
import { APPARATUS_RENDERERS as lensRenderers, type LensStageState } from "../physics/optics/lens/LensStage3D";
import { listLensKitItems } from "../physics/optics/lens/kit-items";
import { readHoist, readPendulum } from "../physics/mechanics/energy/EnergyExploreBench";
import { APPARATUS_RENDERERS as energyRenderers, type EnergyStageState } from "../physics/mechanics/energy/EnergyStage3D";
import { LeverApparatus3D } from "../physics/mechanics/kit/K5Stage";

function apparatusScenes<State, Kind extends string>(
  items: readonly { id: string; kind: Kind }[],
  renderers: Record<Kind, ComponentType<{ state: State }>>,
  state: (kind: Kind) => State,
  assetKey: (item: { id: string; kind: Kind }) => string = (item) => item.id,
  rotationY = 0,
): Record<string, ReactNode> {
  return Object.fromEntries(items.map((item) => {
    const Renderer = renderers[item.kind];
    return [`kit/physics/${assetKey(item)}`, <group scale={0.004} rotation-y={item.kind === "wood_screen" ? Math.PI / 2 : rotationY}>
      {createElement(Renderer, { state: state(item.kind) })}
    </group>];
  }));
}

const probe = readProbe(pressure, 120, 0);
const pistons = readPistons(pressure, 2, 1);
const weights = readPistons(pressure, 3, 0);
const pressureState: FluidStageState = {
  depth: pressure.depthProbe, pistons: pressure.pistons, levels: pressure.display.deformationLevels,
  probe: probe?.ok ? probe.reading : null, reading: pistons?.ok ? pistons.reading : null, reduced: true,
};

const conduction = thermal.conduction!;
const convection = thermal.convection!;
const rods = evaluateConduction(conduction, thermal.clock.maxSeconds, { rods: conduction.materials.slice(0, conduction.maxRods), heated: false, elapsedSeconds: 0 });
const tubes = evaluateConvection(convection, thermal.clock.maxSeconds, { flames: {}, elapsedSeconds: 0 });
const thermalState: ThermalStageState = {
  station: "conduction", reduced: true,
  conduction: { rods: rods.ok ? rods.rods : [], lengthMm: conduction.rodLengthMm, heated: false },
  convection: { tubes: tubes.ok ? tubes.tubes.map((tube) => ({ ...tube, flame: null })) : [], dye: convection.dye },
  radiation: { lampOn: false, screen: true, surface: "black", tenthsC: thermal.radiation!.startTenthsC },
  clock: { seconds: 0, running: false },
};

const ray = readRay(optics, { station: "into-block", mediumId: optics.media[0].id, angles: { "into-block": 30, "out-of-block": 30, prism: 50 } });
const prism = readPrism(optics, 50, "laser");
const opticsState: RefractionStageState = {
  station: "into-block", ray: ray.ok ? ray.view : null, prism: prism.ok ? prism.view : null, revealed: false, reduced: true,
};

const lensState: LensStageState = {
  station: "image", focalMm: 100, objectMm: -200, screenMm: 200, blur: 0, imageScale: -1,
};
const lensKeys = new Map(listLensKitItems(lens).map(({ id, rendererKey }) => [id, rendererKey ?? id]));

const pendulum = readPendulum(energy, { massG: 200, dropHeightMm: 300, position: "mid-down" });
const lift = readHoist(energy, { massG: 1000, distanceMm: 500, motorId: "slow" });
const energyState: EnergyStageState = {
  station: "pendulum", pendulum: pendulum?.ok ? pendulum.view : null, lengthMm: energy.pendulum!.lengthMm,
  scaleMj: 600, lift: lift?.ok ? lift.view : null, lifted: true, maxDistanceMm: energy.hoist!.maxDistanceMm, reduced: true,
};

export const physicsKitScenes: Record<string, ReactNode> = {
  ...apparatusScenes(pressure.enabledApparatus, pressureRenderers,
    (kind) => kind === "weight_set" ? { ...pressureState, reading: weights?.ok ? weights.reading : null } : pressureState),
  ...apparatusScenes(thermal.enabledApparatus.filter(({ kind }) => kind !== "thermometer" && kind !== "stopwatch"), thermalRenderers,
    (kind) => kind === "spirit_lamp" ? { ...thermalState, conduction: { ...thermalState.conduction!, heated: true }, convection: undefined } : thermalState,
    ({ kind }) => kind),
  ...apparatusScenes(optics.enabledApparatus.filter(({ kind }) => kind !== "measurement_table" && kind !== "speed_card"), opticsRenderers,
    (kind): RefractionStageState => kind === "prism" || kind === "screen" ? { ...opticsState, station: "prism" } : opticsState),
  ...apparatusScenes(lens.enabledApparatus.filter(({ kind }) => kind !== "grid"), lensRenderers,
    (kind): LensStageState => kind === "magnifier" ? { ...lensState, station: "magnifier", focalMm: 50, objectMm: 30 } : lensState,
    ({ id }) => lensKeys.get(id) ?? id, -0.7),
  ...apparatusScenes(energy.enabledApparatus, energyRenderers,
    (kind): EnergyStageState => kind === "pendulum" || kind === "energy_bars" ? energyState
      : { ...energyState, station: "hoist", lifted: kind !== "spring_gauge" }),
  "kit/physics/bar": <LeverApparatus3D attachments={[]} tilt="LEVEL" reduced />,
};
