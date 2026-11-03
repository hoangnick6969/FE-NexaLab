import { Html } from "@react-three/drei";
import { EcoStage, FishSchool3D, PondDiorama3D, POND, Thermometer3D, type EcoView, type FishMood } from "../kit";
import { PondScene, type FishState } from "./PondScene";

const VIEW: EcoView = { target: [0, -0.5, 0], direction: [0, 0.38, 1], width: 18.6, height: 7 };
/** Out of range is always below 5,6 °C or above 42 °C for cá rô phi, so the midpoint tells cold from heat. */
const mood = (fish: FishState, valueDeciC: number): FishMood =>
  fish === "hidden" ? "neutral" : fish === "persists" ? "swimming" : valueDeciC >= 240 ? "heat" : "cold";
/** Overlays of the FL-20 Lab the framing keeps clear of. */
const AVOID = [".lab-space-header", ".lab-space-header-actions", ".eco-stage-inner", ".eco-dock", ".lab-space .lab-actions", ".eco-panel[data-open='true']", ".lab-aside"];

/**
 * FL-20 pond as a K8 diorama: the cut-open pond, the school of cá rô phi and a
 * thermometer. Same props and `data-fish` contract as the 2D `PondScene`,
 * which is also the fallback when WebGL is unavailable.
 */
export function PondView3D({ valueDeciC, fish, vigor, label, valueLabel, layoutKey }: {
  valueDeciC: number;
  fish: FishState;
  /** 0–1, how lively the fish look while they can persist (illustrative growth curve). */
  vigor: number;
  label: string;
  valueLabel: string;
  layoutKey: string;
}) {
  return <div className="eco-pond eco-pond-3d" data-fish={fish} role="img" aria-label={label}>
    <EcoStage view={VIEW} avoid={AVOID} layoutKey={layoutKey}
      fallback={<PondScene valueDeciC={valueDeciC} fish={fish} label={label} />}
      scene={({ animate, dark }) => <>
        <PondDiorama3D valueDeciC={valueDeciC} animate={animate} dark={dark} />
        <FishSchool3D mood={mood(fish, valueDeciC)} vigor={vigor} animate={animate} />
        <Thermometer3D valueDeciC={valueDeciC} label={valueLabel} animate={animate} position={[POND.water.x - 0.7, POND.floor + 0.9, 1.2]} />
        {fish === "hidden" && <Html position={[0.6, POND.surface + 1.3, 0]} center zIndexRange={[5, 0]}>
          <span className="eco-pond-question" aria-hidden="true">?</span>
        </Html>}
      </>} />
  </div>;
}
