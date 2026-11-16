/**
 * How each K2 apparatus kind is drawn on the 3D bench: one entry per `ApparatusKind`, looked up by id.
 * A kind is drawn by a shared item (`shared/items/`) or by a mesh this bench owns; the stage never
 * branches on the kind to pick a mesh or a layout number.
 */
import type { ComponentType, ReactNode } from "react";
import { Html } from "@react-three/drei";
import type { ApparatusKind, VesselKind } from "@nexalab/sim/wet-bench";
import { BEAKER_DEFAULT_SIZE, beakerAnchors, beakerInnerHeight, type BeakerSize } from "../../../shared/items/beaker";
import { CYLINDER_DEFAULT_SIZE, cylinderAnchors, cylinderInnerHeight } from "../../../shared/items/item-layout";
import { DigitalScale3D } from "../../../shared/items/digital-scale";
import { Stopwatch3D } from "../../../shared/items/stopwatch";
import { Thermometer3D } from "../../../shared/items/thermometer";
import type { HeldTool } from "./apparatus-manifest";
import {
  Beaker3D, Cylinder3D, Dropper3D, DropperUpright, Flask3D, GlassRod3D, GlassRodHolding, LitmusBox3D, LitmusStrip3D, PhMeter3D, Rack3D, RestPhMeter3D, Spatula3D, SpatulaHolding, Stopper3D, TestTube3D, Tongs3D, TongsHolding, VolumetricFlask3D,
  type VesselProps,
} from "./apparatus3d";
import type { LITMUS_HEX, Look } from "./liquid-look";

/** What the bench state gives a vessel body, beyond its own visual state. */
export type VesselBodyProps = VesselProps & { wasteMicroliters: number };
/** What the bench state gives a non-vessel body. */
export type FixtureBodyProps = { scaleReading: string; clockReading: string; clockRunning: boolean };

export type VesselRenderer = {
  Body: ComponentType<VesselBodyProps>;
  /** Local y of the opening: droppers, tongs and carried vessels hover above it. */
  mouthY: number;
  /** Local y of the inside floor, where the liquid column starts. */
  floorY: number;
  /** Height of the liquid column when drawn full. */
  innerHeight: number;
  /** Radius of the selection ring on the bench. */
  ringRadius: number;
  /** Local y of the name tag; the litmus result chip sits just above it. */
  tagY: number;
  tooltipY: number;
  /** Local y of the pH pen while it stands in this vessel. */
  probeY: number;
};
export type FixtureRenderer = { Body: ComponentType<FixtureBodyProps>; tooltipY: number };

const WASTE_SIZE: BeakerSize = { radius: 0.2, height: 0.34 };
const WASTE_LOOK: Look = { color: "#9ca3a0", opacity: 0.7, surface: "#cbd5e1" };
/** The waste beaker shows how much was poured away, not a reacting solution. */
const WASTE_FULL_MICROLITERS = 120_000;

const beakerLayout = (size: BeakerSize) => ({ mouthY: beakerAnchors(size).mouth[1], floorY: beakerAnchors(size).inside[1], innerHeight: beakerInnerHeight(size) });
const fixture = (Mesh: () => ReactNode, tooltipY = 0.3): FixtureRenderer => ({ Body: () => <Mesh />, tooltipY });

export const VESSEL_RENDERERS: Readonly<Record<VesselKind, VesselRenderer>> = {
  test_tube: { Body: TestTube3D, mouthY: 0.5, floorY: 0.025, innerHeight: 0.43, ringRadius: 0.07, tagY: 0.58, tooltipY: 0.78, probeY: 0.24 },
  beaker_100ml: { Body: Beaker3D, ...beakerLayout(BEAKER_DEFAULT_SIZE), ringRadius: 0.2, tagY: 0.44, tooltipY: 0.66, probeY: 0.1 },
  erlenmeyer_flask_100ml: { Body: Flask3D, mouthY: 0.34, floorY: 0.016, innerHeight: 0.24, ringRadius: 0.2, tagY: 0.44, tooltipY: 0.66, probeY: 0.1 },
  graduated_cylinder_100ml: {
    Body: Cylinder3D, mouthY: cylinderAnchors().mouth[1], floorY: cylinderAnchors().inside[1], innerHeight: cylinderInnerHeight(CYLINDER_DEFAULT_SIZE),
    ringRadius: 0.12, tagY: 0.6, tooltipY: 0.8, probeY: 0.24,
  },
  volumetric_flask_100ml: { Body: VolumetricFlask3D, mouthY: 0.4, floorY: 0.016, innerHeight: 0.38, ringRadius: 0.17, tagY: 0.5, tooltipY: 0.7, probeY: 0.2 },
  waste_beaker: {
    Body: ({ visual, wasteMicroliters, ...rest }) => <Beaker3D {...rest} {...WASTE_SIZE} look={WASTE_LOOK}
      visual={{ ...visual, liquidLevel: Math.min(0.85, wasteMicroliters / WASTE_FULL_MICROLITERS) }} />,
    ...beakerLayout(WASTE_SIZE), ringRadius: 0.24, tagY: 0.44, tooltipY: 0.66, probeY: 0.1,
  },
};

export const FIXTURE_RENDERERS: Readonly<Record<Exclude<ApparatusKind, VesselKind>, FixtureRenderer>> = {
  test_tube_rack_6: fixture(Rack3D, 0.4),
  dropper_pipette: fixture(Dropper3D),
  litmus_strip_dispenser: fixture(LitmusBox3D),
  digital_ph_meter: fixture(RestPhMeter3D),
  tongs: fixture(Tongs3D),
  stopper: fixture(Stopper3D),
  stopwatch: { Body: ({ clockReading, clockRunning }) => <Stopwatch3D reading={clockReading} running={clockRunning} />, tooltipY: 0.2 },
  // Room temperature is fixed in FL-12: the thermometer shows 25 °C, a quarter of a 0 to 100 °C scale.
  thermometer: { Body: () => <Thermometer3D fill={0.25} reading="25,0 °C" />, tooltipY: 0.75 },
  glass_rod: fixture(GlassRod3D, 0.16),
  spatula: fixture(Spatula3D, 0.16),
  electronic_scale: { Body: ({ scaleReading }) => <DigitalScale3D reading={scaleReading} />, tooltipY: 0.3 },
};

/** A tool while the learner carries it empty-handed (tip at the origin), and how large it is drawn in the hand. */
export type HeldToolRenderer = { Body: ComponentType<{ stripColour: keyof typeof LITMUS_HEX | null }>; scale: number };

export const HELD_TOOL_RENDERERS: Readonly<Record<HeldTool, HeldToolRenderer>> = {
  dropper: { Body: () => <DropperUpright liquid={null} squeezeAt={null} />, scale: 1.6 },
  tongs: { Body: () => <TongsHolding piece={null} shape={null} />, scale: 1.6 },
  stopper: { Body: () => <Stopper3D />, scale: 1 },
  spatula: { Body: () => <SpatulaHolding powder={null} />, scale: 1.5 },
  glass_rod: { Body: () => <GlassRodHolding />, scale: 1.2 },
  litmus_paper: { Body: ({ stripColour }) => <LitmusStrip3D colour={stripColour} />, scale: 1.15 },
  ph_meter: {
    Body: () => <>
      <PhMeter3D inserted />
      <Html position={[0, 0.34, 0]} center style={{ pointerEvents: "none" }}><span className="k2-lcd">pH —</span></Html>
    </>,
    scale: 1.6,
  },
};
