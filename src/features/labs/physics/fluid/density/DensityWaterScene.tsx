import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Beaker3D, DigitalBalance3D, GraduatedCylinder3D, K3_SLOTS, BALANCE_PAN_TOP_MM, BALANCE_PAN_Z_MM, cylinderHeightMm, cylinderLevelMm, usePrefersReducedMotion, PourStream3D, type PourStreamSample } from "../kit";
import type { BalanceSample, LiquidSample } from "../kit/k3-motion";
import { fl03DensityConfig as config } from "./fl03-density.config";
import type { Bench } from "./Density2DStage";
import type { DensityEvidence } from "./density-evidence";

type Vessel = "cylinder" | "cup" | "supply";
type Volumes = Record<Vessel, number>;
type Pour = { startedAt: number; elapsed: number; from: Volumes; to: Volumes; source: Vessel; receiver: Vessel };
const SUPPLY = [190, 0, -170] as const;
const smooth = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const WATER_DENSITY = config.materials.find((material) => material.kind === "liquid")!.referenceDensityGcm3;

/** Presentation only: the evidence changes immediately; apparatus follows a conserved-volume pour. */
export function DensityWaterScene({ evidence, bench }: { evidence: DensityEvidence; bench: Bench }) {
  const { balance, cylinder, beaker } = config.instruments;
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const cylinderGroup = useRef<THREE.Group>(null);
  const cupGroup = useRef<THREE.Group>(null);
  const supplyGroup = useRef<THREE.Group>(null);
  const amount = evidence.water.pouredMl;
  // The supply holds the complement of the 100mL sample, including after repeated edits.
  const desired: Volumes = { cylinder: bench.transferred ? 0 : amount, cup: bench.transferred ? amount : 0, supply: 100 - amount };
  const current = useRef<Volumes>({ ...desired });
  const lastPan = useRef(bench.onPan);
  const animation = useRef<Pour | null>(null);
  const cylinderLiquid = useRef<LiquidSample>({ volumeMl: desired.cylinder, ripple: 0 });
  const cupLiquid = useRef<LiquidSample>({ volumeMl: desired.cup, ripple: 0 });
  const supplyLiquid = useRef<LiquidSample>({ volumeMl: desired.supply, ripple: 0 });
  const liveReading = useRef<BalanceSample>({ readingG: bench.onPan ? beaker.emptyMassG + desired.cup * WATER_DENSITY : 0, flowing: false });
  const stream = useRef<PourStreamSample>({ start: new THREE.Vector3(), end: new THREE.Vector3(), visible: false });
  const scratch = useRef({ home: new THREE.Vector3(), target: new THREE.Vector3(), axis: new THREE.Vector3(), direction: new THREE.Vector3() });
  useEffect(() => { invalidate(); }, [amount, bench.transferred, bench.onPan, reduced, invalidate]);

  // Negative priority updates the shared samples BEFORE apparatus/stream subscribers read them.
  // Additional clicks are coalesced into the next pour; a source always returns before starting again.
  useFrame((state, delta) => {
    const groups = { cylinder: cylinderGroup.current, cup: cupGroup.current, supply: supplyGroup.current };
    const homes = { cylinder: K3_SLOTS.cylinder, cup: bench.onPan ? [K3_SLOTS.balance[0], BALANCE_PAN_TOP_MM - 0.5, K3_SLOTS.balance[2] + BALANCE_PAN_Z_MM] : K3_SLOTS.beaker, supply: SUPPLY };
    const heights = { cylinder: cylinderHeightMm(cylinder), cup: beaker.heightMm, supply: beaker.heightMm };
    const radii = { cylinder: cylinder.innerDiameterMm / 2, cup: beaker.innerDiameterMm / 2, supply: beaker.innerDiameterMm / 2 };
    if (reduced) {
      current.current = { ...desired };
      animation.current = null;
    } else if (lastPan.current !== bench.onPan && animation.current) {
      // Moving the receiving cup cancels the pose, but keeps the completed
      // volume target. A simultaneous new pour must still animate from here.
      current.current = { ...animation.current.to };
      animation.current = null;
    }
    lastPan.current = bench.onPan;
    if (!reduced && !animation.current) {
      const source = (Object.keys(desired) as Vessel[]).find((key) => current.current[key] > desired[key] + 0.001);
      const receiver = (Object.keys(desired) as Vessel[]).find((key) => current.current[key] < desired[key] - 0.001);
      if (source && receiver) {
        // One source/receiver per cycle, so even rapid mixed edits conserve all liquid.
        const transfer = Math.min(current.current[source] - desired[source], desired[receiver] - current.current[receiver]);
        const to = { ...current.current, [source]: current.current[source] - transfer, [receiver]: current.current[receiver] + transfer };
        animation.current = { startedAt: performance.now(), elapsed: 0, from: { ...current.current }, to, source, receiver };
      }
    }
    stream.current.visible = false;
    for (const key of Object.keys(groups) as Vessel[]) {
      groups[key]?.position.set(homes[key][0], homes[key][1], homes[key][2]);
      groups[key]?.quaternion.identity();
    }
    const pour = animation.current;
    let flowing = false;
    if (pour) {
      pour.elapsed = (performance.now() - pour.startedAt) / 1000;
      const t = pour.elapsed;
      const progress = smooth((t - 1) / 1); // 1 second of flow after lift + tilt.
      for (const key of Object.keys(desired) as Vessel[]) current.current[key] = THREE.MathUtils.lerp(pour.from[key], pour.to[key], progress);
      const { source, receiver } = pour;
      const { home, target, axis, direction } = scratch.current;
      const sourceHome = homes[source], receiverHome = homes[receiver];
      direction.set(receiverHome[0] - sourceHome[0], 0, receiverHome[2] - sourceHome[2]).normalize();
      axis.set(direction.z, 0, -direction.x);
      const angle = THREE.MathUtils.degToRad(65) * smooth((t - 0.65) / 0.35) * (1 - smooth((t - 2) / 0.35));
      const travel = smooth(t / 0.65) * (1 - smooth((t - 2.35) / 0.65));
      home.set(sourceHome[0] + direction.x * radii[source], sourceHome[1] + heights[source], sourceHome[2] + direction.z * radii[source]);
      target.set(receiverHome[0] - direction.x * 8, Math.max(sourceHome[1] + heights[source] + 60, receiverHome[1] + heights[receiver] + 65), receiverHome[2] - direction.z * 8);
      const group = groups[source];
      if (group) {
        group.quaternion.setFromAxisAngle(axis, angle);
        // Rotate around the actual mouth rim, then move its pivot along a lifted arc.
        group.position.set(-direction.x * radii[source], -heights[source], -direction.z * radii[source]).applyQuaternion(group.quaternion);
        group.position.add(home.lerp(target, travel));
        group.position.y += Math.sin(travel * Math.PI) * 85;
        stream.current.start.set(direction.x * radii[source], heights[source], direction.z * radii[source]).applyQuaternion(group.quaternion).add(group.position);
      }
      flowing = t >= 1 && t < 2;
      stream.current.visible = flowing;
      const receiverLevel = receiver === "cylinder" ? cylinder.baseMm + cylinderLevelMm(cylinder, current.current[receiver]) : 1.5 + current.current[receiver] * 1000 / (Math.PI * radii[receiver] ** 2);
      stream.current.end.set(receiverHome[0], receiverHome[1] + receiverLevel, receiverHome[2]);
      if (t >= 3) { current.current = { ...pour.to }; animation.current = null; }
      state.invalidate();
    }
    const signals = { cylinder: cylinderLiquid, cup: cupLiquid, supply: supplyLiquid };
    for (const key of Object.keys(signals) as Vessel[]) {
      const sample = signals[key].current;
      sample.volumeMl = current.current[key];
      sample.ripple = reduced ? 0 : flowing && pour?.receiver === key ? 1 : sample.ripple * Math.exp(-Math.min(delta, 0.05) * 5);
      if (sample.ripple > 0.002) state.invalidate();
      else sample.ripple = 0;
    }
    const cupAway = pour?.source === "cup" && pour.elapsed < 3;
    liveReading.current.readingG = bench.onPan && !cupAway ? beaker.emptyMassG + current.current.cup * WATER_DENSITY : 0;
    liveReading.current.flowing = !!animation.current;
    // Follow the balance pan's static load deflection; source cup is detached while pouring.
    if (bench.onPan && !cupAway && cupGroup.current) cupGroup.current.position.y -= 1.2 * Math.min(1, liveReading.current.readingG / balance.capacityG);
  }, -1);

  return <group name="density-water-scene">
    <group position={[...K3_SLOTS.balance]}><DigitalBalance3D instrument={balance} readingG={liveReading.current.readingG} liveReading={liveReading} /></group>
    <group ref={cylinderGroup} position={[...K3_SLOTS.cylinder]} name="pour-cylinder"><GraduatedCylinder3D cylinder={cylinder} volumeMl={desired.cylinder} liquid={cylinderLiquid} /></group>
    <group ref={cupGroup} name="pour-cup"><Beaker3D beaker={beaker} waterMl={desired.cup} liquid={cupLiquid} /></group>
    <group ref={supplyGroup} position={[...SUPPLY]} name="pour-supply"><Beaker3D beaker={beaker} waterMl={desired.supply} liquid={supplyLiquid} /></group>
    <PourStream3D sample={stream} />
  </group>;
}
