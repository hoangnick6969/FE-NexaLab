import { useContext, useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LabSceneContext } from "../../../shared/LabSpace";
import {
  DigitalBalance3D, FluidBench3D, GraduatedCylinder3D, K3Slot, Specimen3D, cylinderHeightMm,
  k3Material, k3Specimen, usePrefersReducedMotion,
} from "../kit";
import { fl03DensityConfig as config } from "./fl03-density.config";
import { DensityWaterScene } from "./DensityWaterScene";
import type { DensityEvidence, StationId } from "./density-evidence";
import { balanceReadingG, cylinderVolumeMl, stationSpecimenId, type Bench } from "./Density2DStage";

/** Eases a child from `from` down (or up) to `to` in local mm on a damped spring; reduced motion snaps. */
function Settle({ from, to, children }: { from: number; to: number; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const y = useRef(from);
  useEffect(() => { invalidate(); }, [to, invalidate]);
  useFrame((state, delta) => {
    if (!group.current) return;
    y.current = reduced ? to : THREE.MathUtils.damp(y.current, to, 9, Math.min(delta, 1 / 30));
    if (Math.abs(y.current - to) < 0.01) y.current = to;
    group.current.position.y = y.current;
    if (y.current !== to) state.invalidate();
  });
  return <group ref={group} position={[0, from, 0]}>{children}</group>;
}

/**
 * FL-03 3D bench: the same station state as the 2D pilot, shown with the shared
 * K3 apparatus. Motion only presents values the activity already holds; no
 * reading or score is computed here.
 */
export function Density3DStage({ station, evidence, bench }: { station: StationId; evidence: DensityEvidence; bench: Bench }) {
  const sceneRoot = useContext(LabSceneContext);
  useEffect(() => {
    // The canvas is decorative: every reading is also in the DOM controls and notebook.
    if (!sceneRoot) return;
    sceneRoot.setAttribute("aria-hidden", "true");
    return () => sceneRoot.removeAttribute("aria-hidden");
  }, [sceneRoot]);

  const { balance, cylinder } = config.instruments;
  const specimen = k3Specimen(config, stationSpecimenId(station, evidence, bench));
  const material = k3Material(config, specimen.materialId);
  const reading = balanceReadingG(station, evidence, bench);
  const cylinderMl = cylinderVolumeMl(station, evidence, bench);
  const pebbleSunk = station === "pebble" && bench.dropped && specimen.shape === "irregular";
  const showCylinder = station === "water" || station === "pebble";

  // Load on the pan: the cup for the water station, otherwise the selected specimen (dropped pebbles sit in the cylinder).
  const panLoad = bench.onPan && !pebbleSunk ? <Settle from={70} to={0}><Specimen3D specimen={specimen} material={material} /></Settle> : null;

  return <FluidBench3D>
    {station === "water" ? <DensityWaterScene evidence={evidence} bench={bench} /> : <>
    <K3Slot at="balance">
      <DigitalBalance3D instrument={balance} readingG={reading}>{panLoad}</DigitalBalance3D>
    </K3Slot>
    {showCylinder && <K3Slot at="cylinder">
      <GraduatedCylinder3D cylinder={cylinder} volumeMl={cylinderMl}>
        {pebbleSunk && <Settle from={cylinderHeightMm(cylinder) + 8} to={cylinder.baseMm}>
          <Specimen3D specimen={specimen} material={material} cylinderInnerRadiusMm={cylinder.innerDiameterMm / 2} />
        </Settle>}
      </GraduatedCylinder3D>
    </K3Slot>}
    {!bench.onPan && !pebbleSunk && station !== "conclusion" && <K3Slot at="tray">
      <Specimen3D specimen={specimen} material={material} />
    </K3Slot>}
    </>}
  </FluidBench3D>;
}
