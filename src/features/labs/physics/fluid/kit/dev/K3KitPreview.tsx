import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Beaker3D, ForceVectorOverlay3D, OverflowCan3D, SpringDynamometer3D, type K3CameraPreset } from "..";
import { useNavigate } from "react-router-dom";
import { LabSpace } from "../../../../shared/LabSpace";
import { LabRendererToggle, useLabRendererMode } from "../../../../shared/LabRendererToggle";
import { fl03DensityConfig, fl03Stations } from "../../density/fl03-density.config";
import { Balance2D, Cylinder2D, DigitalBalance3D, FluidBench3D, GraduatedCylinder3D, K3Hud, K3Slot, K3_SLOTS, Specimen3D, FluidKitLayoutShell, formatReading, k3Material, k3Specimen } from "..";
import { BALANCE_PAN_TOP_MM, BALANCE_PAN_Z_MM } from "../apparatus/DigitalBalance3D";
import { K3_MOTION, dampedSpringStep, usePrefersReducedMotion } from "../k3-motion";

function MovingSpecimen3D({ specimen, material, targetPosition, massG, visible, immersed, forceN, buoyantForceN, cylinderInnerRadiusMm }: {
  specimen: ReturnType<typeof k3Specimen>;
  material: ReturnType<typeof k3Material>;
  targetPosition: [number, number, number];
  massG: number;
  visible: boolean;
  immersed: boolean;
  forceN: number;
  buoyantForceN: number;
  cylinderInnerRadiusMm?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const specimenPosition = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3(...targetPosition));
  const spring = { ...K3_MOTION.specimenSpring, massKg: THREE.MathUtils.clamp(massG / 1000, K3_MOTION.specimenSpring.minimumMassKg, K3_MOTION.specimenSpring.maximumMassKg) };
  useEffect(() => {
    target.current.set(...targetPosition);
    invalidate();
  }, [targetPosition[0], targetPosition[1], targetPosition[2], invalidate]);
  useFrame((state, delta) => {
    const group = specimenPosition.current;
    if (!group) return;
    if (reduced) {
      group.position.copy(target.current);
      velocity.current.set(0, 0, 0);
      return;
    }
    const dt = Math.min(delta, 1 / 30);
    const nextX = dampedSpringStep(group.position.x, velocity.current.x, target.current.x, dt, spring);
    const nextY = dampedSpringStep(group.position.y, velocity.current.y, target.current.y, dt, spring);
    const nextZ = dampedSpringStep(group.position.z, velocity.current.z, target.current.z, dt, spring);
    group.position.set(nextX.position, nextY.position, nextZ.position);
    velocity.current.set(nextX.velocity, nextY.velocity, nextZ.velocity);
    if (group.position.distanceToSquared(target.current) > 0.01 || velocity.current.lengthSq() > 0.02) state.invalidate();
  });
  const specimenHeightMm = specimen.shape === "box" ? specimen.sizeMm[2] : specimen.maxWidthMm;
  return <group ref={specimenPosition} position={targetPosition} visible={visible}>
    <Specimen3D specimen={specimen} material={material} cylinderInnerRadiusMm={cylinderInnerRadiusMm} />
    {immersed && <ForceVectorOverlay3D weightN={forceN} buoyantForceN={buoyantForceN} position={[0, specimenHeightMm / 2, 0]} />}
  </group>;
}

/**
 * Development-only bench for inspecting K3 apparatus with FL-03 sample data.
 * Values here are config presentation, not a Lab run and not graded.
 */
export default function K3KitPreview() {
  const navigate = useNavigate();
  const config = fl03DensityConfig;
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:k3-preview");
  const [stationId, setStationId] = useState<string>("explore");
  const station = fl03Stations.find((item) => item.id === stationId)!;
  const [specimenId, setSpecimenId] = useState<string>("iron-1v");
  const [onPan, setOnPan] = useState(false);
  const [waterMl, setWaterMl] = useState(50);
  const [dropped, setDropped] = useState(false);
  const [immersed, setImmersed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<K3CameraPreset>("overview");
  const [submergedVolumeMl, setSubmergedVolumeMl] = useState(0);
  const [collectedMl, setCollectedMl] = useState(0);
  const [liquidKind, setLiquidKind] = useState<"water" | "brine">("water");
  const specimen = k3Specimen(config, station.specimens.length && (station.specimens as readonly string[]).includes(specimenId) ? specimenId : station.specimens[0] ?? "iron-1v");
  const material = k3Material(config, specimen.materialId);
  const readingG = onPan ? specimen.massG : 0;
  const pebbleInCylinder = dropped && specimen.shape === "irregular";
  const cylinderMl = waterMl + (pebbleInCylinder && specimen.shape === "irregular" ? specimen.volumeMl : 0);
  const specimenVolumeMl = specimen.shape === "irregular" ? specimen.volumeMl : specimen.sizeMm[0] * specimen.sizeMm[1] * specimen.sizeMm[2] / 1000;
  const weightN = specimen.massG * 9.81 / 1000;
  const buoyantForceN = weightN * Math.min(1, submergedVolumeMl / Math.max(specimenVolumeMl, 0.01));
  const apparentForceN = Math.max(0, weightN - buoyantForceN);
  const forceReadingN = immersed ? apparentForceN : 0;
  const { balance, cylinder, beaker } = config.instruments;
  const beakerAreaMm2 = Math.PI * (beaker.innerDiameterMm / 2) ** 2;
  const beakerSurfaceMm = (waterMl * 1000) / beakerAreaMm2;
  const specimenHeightMm = specimen.shape === "box" ? specimen.sizeMm[2] : specimen.maxWidthMm;
  const immersionFraction = Math.min(1, submergedVolumeMl / Math.max(specimenVolumeMl, 0.01));
  const specimenTargetPosition: [number, number, number] = dropped && specimen.shape === "irregular"
    ? [K3_SLOTS.cylinder[0], cylinder.baseMm, K3_SLOTS.cylinder[2]]
    : immersed
      ? [K3_SLOTS.beaker[0], beakerSurfaceMm + submergedVolumeMl * 1000 / beakerAreaMm2 - immersionFraction * specimenHeightMm, K3_SLOTS.beaker[2]]
      : onPan
        ? [K3_SLOTS.balance[0], BALANCE_PAN_TOP_MM - 0.5, K3_SLOTS.balance[2] + BALANCE_PAN_Z_MM]
        : [...K3_SLOTS.sampleStaging];

  const selectStation = (id: string) => {
    setStationId(id);
    const first = fl03Stations.find((item) => item.id === id)?.specimens[0];
    if (first) setSpecimenId(first);
    setOnPan(false);
    setDropped(false);
    setImmersed(false);
    setSubmergedVolumeMl(0);
  };

  return <LabSpace title="Bàn chất lỏng K3, xem trước" onExit={() => navigate("/")}>
    <LabRendererToggle mode={mode} onChange={setMode} />
    <FluidKitLayoutShell mode={mode} ariaLabel="K3 Fluid Bench preview">
    <div className={`fluid-kit-renderer fluid-kit-renderer-3d${mode === "3d" ? " is-active" : ""}`} aria-hidden={mode !== "3d"}>
    <FluidBench3D cameraPreset={cameraPreset} active={mode === "3d"}>
      <K3Slot at="balance">
        <DigitalBalance3D instrument={balance} readingG={readingG} />
      </K3Slot>
      <K3Slot at="cylinder"><GraduatedCylinder3D cylinder={cylinder} volumeMl={cylinderMl} /></K3Slot>
      <K3Slot at="beaker"><Beaker3D beaker={config.instruments.beaker} waterMl={waterMl} submergedVolumeMl={submergedVolumeMl} liquidKind={liquidKind} /></K3Slot>
      <K3Slot at="dynamometer"><SpringDynamometer3D forceN={Math.min(5, forceReadingN)} /></K3Slot>
      <K3Slot at="overflowCan"><OverflowCan3D collectedMl={collectedMl} liquidKind={liquidKind} /></K3Slot>
      <MovingSpecimen3D
        specimen={specimen}
        material={material}
        targetPosition={specimenTargetPosition}
        massG={specimen.massG}
        visible={station.specimens.length > 0}
        immersed={immersed}
        forceN={weightN}
        buoyantForceN={buoyantForceN}
        cylinderInnerRadiusMm={dropped && specimen.shape === "irregular" ? cylinder.innerDiameterMm / 2 : undefined}
      />
    </FluidBench3D>
    </div>
    <div className={`fluid-kit-renderer fluid-kit-renderer-2d${mode === "2d" ? " is-active" : ""}`} aria-hidden={mode !== "2d"}>
    <div className="k3-preview-2d">
      <Balance2D instrument={balance} readingG={readingG} label="Cân điện tử" />
      <Cylinder2D cylinder={cylinder} volumeMl={cylinderMl} label={`Ống đong ${cylinderMl} mL`} />
      <Cylinder2D cylinder={cylinder} volumeMl={cylinderMl} label="Phóng to mặt khum" zoom />
    </div>
    </div>
    <K3Hud
      title="K3 Fluid Bench · preview"
      stations={fl03Stations.map((item) => ({ id: item.id, label: { explore: "Khám phá", block: "Khối gỗ", water: "Nước", pebble: "Sỏi", conclusion: "Kết luận" }[item.id] }))}
      current={stationId}
      cameraPreset={cameraPreset}
      onCameraPresetChange={setCameraPreset}
      onSelect={selectStation}
      step={{ index: fl03Stations.findIndex((item) => item.id === stationId), total: fl03Stations.length }}
      instruction={`Mẫu ${material.label.vi.toLowerCase()} (${specimen.id}). Điều chỉnh các giá trị minh họa để kiểm tra apparatus; không phải thí nghiệm FL-05 đã duyệt.`}
      readout={<>Cân: {formatReading(readingG, balance.resolutionG)} g, ống đong: {cylinderMl} mL</>}
      telemetry={<><span>Lực kế minh họa: {forceReadingN.toFixed(2)} N</span><span>P: {weightN.toFixed(2)} N, F_A: {immersed ? buoyantForceN.toFixed(2) : "0.00"} N</span><span>V chìm: {immersed ? submergedVolumeMl : 0} mL</span><span>Tràn: {collectedMl} mL</span></>}
      formulaLatex={String.raw`F_A = P_0 - P_{\mathrm{submerged}} = d \cdot V_{\mathrm{displaced}}`}
      notice={`Bản xem trước bộ kit, số liệu ${config.reviewStatus === "REVIEWED" ? "đã duyệt" : "đề xuất, chưa duyệt"}; không chấm điểm.`}
      actions={<>
        {station.specimens.length > 0 && <select aria-label="Mẫu vật" value={specimen.id} onChange={(event) => { setSpecimenId(event.target.value); setOnPan(false); setDropped(false); setImmersed(false); setSubmergedVolumeMl(0); }}>
          {station.specimens.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>}
        <button type="button" className="secondary" onClick={() => { setOnPan(!onPan); setImmersed(false); setDropped(false); }} disabled={!station.specimens.length || pebbleInCylinder || immersed}>{onPan ? "Lấy khỏi cân" : "Đặt lên cân"}</button>
        {!immersed && <button type="button" className="secondary" onClick={() => { setOnPan(false); setDropped(false); setImmersed(true); if (submergedVolumeMl === 0) setSubmergedVolumeMl(Math.min(5, Math.round(specimenVolumeMl))); }} disabled={!station.specimens.length || pebbleInCylinder}>Nhúng mẫu vào bình</button>}
        {immersed && <button type="button" className="secondary" onClick={() => { setImmersed(false); setSubmergedVolumeMl(0); }}>Lấy mẫu khỏi bình</button>}
        {specimen.shape === "irregular" && <button type="button" className="secondary" onClick={() => { setOnPan(false); setImmersed(false); setDropped(!dropped); }}>{dropped ? "Lấy sỏi ra" : "Thả sỏi vào ống đong"}</button>}
        <label className="k3-range">Chất lỏng
          <select value={liquidKind} onChange={(event) => setLiquidKind(event.target.value as "water" | "brine")}><option value="water">Nước (IOR 1.333)</option><option value="brine">Nước muối (IOR 1.37, preview)</option></select>
        </label>
        <label className="k3-range">Thể tích chìm minh họa {submergedVolumeMl} mL
          <input type="range" min={0} max={Math.max(10, Math.round(specimenVolumeMl))} step={1} value={submergedVolumeMl} disabled={!immersed} onChange={(event) => setSubmergedVolumeMl(Number(event.target.value))} />
        </label>
        <label className="k3-range">Nước tràn thu vào minh họa {collectedMl} mL
          <input type="range" min={0} max={35} step={1} value={collectedMl} onChange={(event) => setCollectedMl(Number(event.target.value))} />
        </label>
        <label className="k3-range">Nước ban đầu {waterMl} mL
          <input type="range" min={0} max={80} step={1} value={waterMl} onChange={(event) => setWaterMl(Number(event.target.value))} />
        </label>
      </>}
    />
    </FluidKitLayoutShell>
  </LabSpace>;
}
