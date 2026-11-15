/**
 * Development-only route `/dev/lab-kits/shared-items`.
 * Draws every shared item once with sample props, so a reviewer can look at the shapes. Not a Lab, no engine, no model.
 */
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";
import { PhysicalLabEnvironment } from "../../PhysicalLabEnvironment";
import { Beaker3D } from "../beaker";
import { DigitalScale3D } from "../digital-scale";
import { GraduatedCylinder3D } from "../graduated-cylinder";
import { cylinderMarkHeights } from "../item-layout";
import { Stopwatch3D } from "../stopwatch";
import { Thermometer3D } from "../thermometer";

const WATER = { color: "#8fcbe8", opacity: 0.6, surface: "#a8d8ef" };

export default function SharedItemsPreview() {
  const [fill, setFill] = useState(0.6);
  const [running, setRunning] = useState(false);
  const marks = cylinderMarkHeights();
  return <main style={{ height: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
    <div className="k2-devbar" aria-label="Thanh dev" style={{ padding: 8, display: "flex", gap: 16, alignItems: "center" }}>
      <label>Mức đầy <input type="range" min={0} max={1} step={0.05} value={fill} onChange={(event) => setFill(Number(event.target.value))} /> {Math.round(fill * 100)}%</label>
      <label><input type="checkbox" checked={running} onChange={(event) => setRunning(event.target.checked)} /> Đồng hồ chạy</label>
      <span>Nhãn thang ống đong do bàn vẽ ({marks.length} vạch)</span>
    </div>
    <Canvas shadows camera={{ position: [0, 0.9, 3.4], fov: 38 }} data-testid="shared-items-canvas">
      <PhysicalLabEnvironment />
      <group position={[-1.2, 0.1, 0]}><Beaker3D fill={fill} liquid={WATER} /></group>
      <group position={[-0.6, 0.1, 0]}><GraduatedCylinder3D fill={fill} liquid={WATER} /></group>
      <group position={[0, 0.1, 0]}><Thermometer3D fill={fill} reading={`${(20 + fill * 80).toFixed(1).replace(".", ",")} °C`} /></group>
      <group position={[0.6, 0.1, 0]}><Stopwatch3D reading={running ? "00:12,3" : "00:00,0"} running={running} /></group>
      <group position={[1.4, 0.1, 0]}><DigitalScale3D reading="120,00 g" /></group>
      <OrbitControls target={[0, 0.3, 0]} />
    </Canvas>
  </main>;
}
