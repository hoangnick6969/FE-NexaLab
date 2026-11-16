/**
 * FL-26 k8-garden bench, 3D: the K8 meadow block (`EcoStage` + `MeadowDiorama3D`, the stage of FL-20/FL-21) set up
 * as a pea garden. Back row: the two P plants with the gametes each makes; front row: one F1 pot per Punnett cell,
 * in bud until the student flips that cell. Catalog note: K8 is "2D-first, 3D tuỳ chọn", so the 2D garden
 * (`MendelGardenScene`) stays the reference view and the fallback when WebGL is missing. Every value drawn here is
 * also in the DOM (Punnett board and readout); the canvas is decorative.
 * Direct manipulation (see `garden-interaction.ts`): click a P plant to change its genotype; click an F1 pot to open it,
 * or press on a gamete and release it over a pot. Label buttons stop pointer-down from bubbling to the orbit controls
 * (they listen on the canvas container), so dragging a gamete never turns the camera.
 */
import { useRef } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { potTag, type GardenHandlers } from "./garden-interaction";
import { EcoStage, MeadowDiorama3D, MEADOW, type EcoView } from "../ecology/kit";
import { MendelGardenScene, isDominant, phenotypeVi } from "./MendelGardenScene";

const VIEW: EcoView = { target: [0, 1.2, 0.1], direction: [0, 0.4, 1], width: 9.5, height: 4.6 };
const AVOID = [".lab-space-header", ".lab-space-header-actions", ".lab-aside"];
const PURPLE = "#7c4dbd";
const WHITE = "#f4f1fa";
const POT = "#b9653b";

function Flower({ tone }: { tone: "dominant" | "recessive" | "unknown" }) {
  if (tone === "unknown") return <mesh position={[0, 0, 0]} castShadow><sphereGeometry args={[0.13, 16, 12]} /><meshStandardMaterial color="#5f9e4f" roughness={0.7} /></mesh>;
  const color = tone === "dominant" ? PURPLE : WHITE;
  return <group>
    {[0, 1, 2, 3, 4].map((index) => {
      const angle = (index / 5) * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, 0]} rotation={[0, 0, angle]} scale={[1.6, 1, 0.45]} castShadow>
        <sphereGeometry args={[0.1, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>;
    })}
    <mesh position={[0, 0, 0.04]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#f2c12e" roughness={0.5} /></mesh>
  </group>;
}

type Pointer = {
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
  hint?: string;
};

export function PeaPlant3D({ position, genotype, scale = 1, pointer, glow = false }: { position: [number, number, number]; genotype: string | null; scale?: number; pointer?: Pointer; glow?: boolean }) {
  const tone = !genotype ? "unknown" : isDominant(genotype) ? "dominant" : "recessive";
  const handlers = pointer ? {
    onClick: pointer.onClick,
    onPointerUp: pointer.onPointerUp,
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); document.body.style.cursor = "pointer"; },
    onPointerOut: () => { document.body.style.cursor = ""; },
  } : {};
  return <group position={position} scale={scale} {...handlers}>
    <mesh position={[0, 0.3, 0]} castShadow receiveShadow><cylinderGeometry args={[0.42, 0.3, 0.6, 24]} /><meshStandardMaterial color={POT} roughness={0.8} emissive={glow ? "#f2c12e" : "#000000"} emissiveIntensity={glow ? 0.35 : 0} /></mesh>
    <mesh position={[0, 0.62, 0]} castShadow><torusGeometry args={[0.42, 0.06, 10, 28]} /><meshStandardMaterial color="#a4552f" roughness={0.8} /></mesh>
    <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.38, 24]} /><meshStandardMaterial color="#5a3d26" roughness={1} /></mesh>
    <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 1.3, 8]} /><meshStandardMaterial color="#3f7d3a" roughness={0.7} /></mesh>
    <mesh position={[-0.2, 1.05, 0]} rotation={[0, 0, 0.7]} scale={[1.8, 0.7, 0.35]} castShadow><sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color="#58a14b" roughness={0.6} /></mesh>
    <mesh position={[0.22, 1.35, 0]} rotation={[0, 0, -0.7]} scale={[1.8, 0.7, 0.35]} castShadow><sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color="#58a14b" roughness={0.6} /></mesh>
    <group position={[0, 2, 0]}><Flower tone={tone} /></group>
    {/* Larger invisible hit volume so the whole plant (pot to flower) is easy to click or drop on. */}
    {pointer && <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.55, 0.55, 2.4, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>}
  </group>;
}

function Gamete3D({ position, allele, parent, handlers }: { position: [number, number, number]; allele: string; parent: 0 | 1; handlers: GardenHandlers }) {
  const dominant = isDominant(allele);
  const carried = handlers.carrying?.parent === parent && handlers.carrying.allele === allele;
  return <group position={position}>
    <mesh castShadow><sphereGeometry args={[0.2, 20, 14]} /><meshStandardMaterial color={dominant ? "#ece3f8" : "#ffffff"} emissive={dominant ? "#3d1f6b" : "#000000"} emissiveIntensity={dominant ? 0.15 : 0} roughness={0.35} /></mesh>
    <Html center zIndexRange={[6, 0]}>
      {handlers.onGameteDown
        ? <button type="button" className="mendel-3d-gamete is-draggable" data-allele={dominant ? "dominant" : "recessive"} data-carried={carried || undefined}
            aria-label={`Giao tử ${allele} của ${parent === 0 ? "bố" : "mẹ"}: nhấn giữ rồi thả vào một chậu F1`}
            data-testid={`gamete-3d-${parent}-${allele}`}
            onPointerDown={(event) => { event.stopPropagation(); handlers.onGameteDown!(parent, allele, event); }}>{allele}</button>
        : <span className="mendel-3d-gamete" data-allele={dominant ? "dominant" : "recessive"}>{allele}</span>}
    </Html>
  </group>;
}

export function MendelGarden3D({ parents, gametes, punnett, revealed, layoutKey, handlers = {} }: {
  parents: [string, string];
  gametes: [string[], string[]];
  punnett: string[][];
  revealed: ReadonlySet<string>;
  layoutKey: string;
  handlers?: GardenHandlers;
}) {
  const offspring = punnett.flatMap((row, r) => row.map((genotype, c) => ({ key: `${r}:${c}`, genotype, r, c })));
  const label = `Vườn đậu Hà Lan 3D: P ${parents[0]} × ${parents[1]}; giao tử bố ${gametes[0].join(", ")}, giao tử mẹ ${gametes[1].join(", ")}; F1 đã lật ${revealed.size}/${offspring.length} cây. Bấm cây bố hoặc mẹ để đổi kiểu gen, bấm chậu F1 hoặc thả giao tử vào chậu để mở.`;
  const parentAt: Array<[number, number, number]> = [[-2.6, MEADOW.top, -1.4], [2.6, MEADOW.top, -1.4]];
  // A drop is a pointer-up on a pot; the click R3F fires right after it must not also open the pot.
  const dropped = useRef(false);
  const potPointer = (key: string): Pointer | undefined => (handlers.onPot || handlers.onPotUp) ? {
    onPointerUp: (event) => { if (handlers.carrying) { event.stopPropagation(); dropped.current = true; window.setTimeout(() => { dropped.current = false; }, 0); handlers.onPotUp?.(key); } },
    onClick: (event) => { event.stopPropagation(); if (dropped.current) { dropped.current = false; return; } handlers.onPot?.(key); },
  } : undefined;
  return <div className="mendel-garden-3d" data-testid="mendel-garden-3d" role="img" aria-label={label} data-carrying={handlers.carrying ? "true" : undefined}>
    <EcoStage view={VIEW} avoid={AVOID} layoutKey={layoutKey}
      fallback={<MendelGardenScene parents={parents} gametes={gametes} punnett={punnett} revealed={revealed} handlers={handlers} />}
      scene={({ dark }) => <>
        <MeadowDiorama3D dark={dark} clear={[[-2.6, -1.4, 1], [2.6, -1.4, 1], [-3, 1.5, 0.7], [-1, 1.5, 0.7], [1, 1.5, 0.7], [3, 1.5, 0.7]]} />
        {parents.map((genotype, index) => <group key={index}>
          <PeaPlant3D position={parentAt[index]} genotype={genotype} scale={1.15}
            pointer={handlers.onParent ? { onClick: (event) => { event.stopPropagation(); handlers.onParent!(index as 0 | 1); } } : undefined} />
          <Html position={[parentAt[index][0], 3, parentAt[index][2]]} center zIndexRange={[6, 0]}>
            {handlers.onParent
              ? <button type="button" className="mendel-3d-tag is-button" data-testid={`parent-3d-${index}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => handlers.onParent!(index as 0 | 1)}
                  aria-label={`${index === 0 ? "Bố" : "Mẹ"} ${genotype}: bấm để đổi kiểu gen`}><b>{genotype}</b> {index === 0 ? "Bố" : "Mẹ"} · {phenotypeVi(genotype)} <span aria-hidden="true">⟳</span></button>
              : <span className="mendel-3d-tag"><b>{genotype}</b> {index === 0 ? "Bố" : "Mẹ"} · {phenotypeVi(genotype)}</span>}
          </Html>
          {gametes[index].map((allele, g) => <Gamete3D key={g} position={[parentAt[index][0] + (g === 0 ? -0.85 : 0.85), 1.1, -0.9]} allele={allele} parent={index as 0 | 1} handlers={handlers} />)}
        </group>)}
        <Html position={[0, 1.6, -1.4]} center zIndexRange={[5, 0]}><span className="mendel-3d-cross" aria-hidden="true">×</span></Html>
        {offspring.map(({ key, genotype, r, c }, index) => {
          const x = -3 + index * 2;
          const shown = revealed.has(key);
          const tag = potTag(shown, genotype, handlers.drops?.[key], [gametes[0][r], gametes[1][c]]);
          return <group key={key}>
            <PeaPlant3D position={[x, MEADOW.top, 1.5]} genotype={shown ? genotype : null} scale={0.75} pointer={potPointer(key)} glow={Boolean(handlers.carrying) && !shown} />
            <Html position={[x, 0.15, 2.25]} center zIndexRange={[6, 0]}>
              {handlers.onPot
                ? <button type="button" className="mendel-3d-tag mendel-3d-tag-small is-button" data-testid={`pot-3d-${key}`} data-open={shown || undefined} onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={() => { if (handlers.carrying) { dropped.current = true; window.setTimeout(() => { dropped.current = false; }, 0); handlers.onPotUp?.(key); } }}
                    onClick={() => { if (dropped.current) { dropped.current = false; return; } handlers.onPot!(key); }}
                    aria-label={shown ? `Cây F1 ô ${r + 1}-${c + 1}: ${genotype}` : `Chậu F1 ô ${r + 1}-${c + 1}: bấm để mở, hoặc thả giao tử vào`}>F1 · {tag}</button>
                : <span className="mendel-3d-tag mendel-3d-tag-small">F1 · {shown ? genotype : "?"}</span>}
            </Html>
          </group>;
        })}
      </>} />
  </div>;
}
