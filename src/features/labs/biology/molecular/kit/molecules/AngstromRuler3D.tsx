import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { K7Structure } from "../k7-config";
import { NM_PER_ANGSTROM, axisX, helixSpec } from "../k7-geometry";
import { TextLabel } from "./labels";

const INK = "#e8f3f8";

function bar(width: number, height: number, x: number, y: number) {
  return new THREE.BoxGeometry(width, height, 0.014).translate(x, y, 0);
}

/**
 * Measuring aids for the double helix, in ångström: a scale along the axis
 * under one full turn and a scale across the diameter, each with 1 Å minor
 * ticks. Dashed guides mark where the same strand repeats after one turn.
 * Labels are numbers and units only; the learner reads and counts.
 */
export function AngstromRuler3D({ structure, count, startPair = 0 }: { structure: K7Structure; count: number; startPair?: number }) {
  const spec = useMemo(() => helixSpec(structure), [structure]);
  const x0 = axisX(startPair, count, spec);
  const y = -spec.radius - 0.75;
  const lengthA = Math.ceil(structure.turnLengthA / 10) * 10;
  const diameterA = Math.round(structure.diameterA);
  const xr = axisX(count - 1, count, spec) + 0.9;
  const turnEnd = x0 + structure.turnLengthA * NM_PER_ANGSTROM;

  // All scale lines merged into one mesh (one draw call).
  const scale = useMemo(() => {
    const parts = [bar(lengthA * NM_PER_ANGSTROM, 0.018, x0 + (lengthA * NM_PER_ANGSTROM) / 2, y), bar(0.018, spec.radius * 2, xr, 0)];
    for (let a = 0; a <= lengthA; a++) {
      const h = a % 10 === 0 ? 0.2 : a % 5 === 0 ? 0.13 : 0.07;
      parts.push(bar(0.012, h, x0 + a * NM_PER_ANGSTROM, y + h / 2));
    }
    for (let a = 0; a <= diameterA; a++) {
      const w = a % 10 === 0 ? 0.2 : a % 5 === 0 ? 0.13 : 0.07;
      parts.push(bar(w, 0.012, xr + w / 2, -spec.radius + a * NM_PER_ANGSTROM));
    }
    const merged = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return merged;
  }, [lengthA, diameterA, x0, y, xr, spec.radius]);
  const guides = useMemo(() => {
    const parts = [x0, turnEnd].map((x) => bar(0.01, spec.radius * 2 + 1.3, x, 0));
    const merged = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return merged;
  }, [x0, turnEnd, spec.radius]);
  useEffect(() => () => { scale.dispose(); guides.dispose(); }, [scale, guides]);

  const axialLabels = Array.from({ length: lengthA / 10 + 1 }, (_, k) => k * 10);
  const diameterLabels = Array.from({ length: Math.floor(diameterA / 10) + 1 }, (_, k) => k * 10);
  return <group>
    <mesh geometry={scale}><meshBasicMaterial color={INK} toneMapped={false} /></mesh>
    <mesh geometry={guides}><meshBasicMaterial color="#ffd27a" transparent opacity={0.6} depthWrite={false} toneMapped={false} /></mesh>
    {axialLabels.map((a) => <TextLabel key={`x${a}`} text={a === lengthA ? `${a} Å` : `${a}`} height={0.2} position={[x0 + a * NM_PER_ANGSTROM, y - 0.24, 0]} />)}
    {diameterLabels.map((a) => <TextLabel key={`d${a}`} text={a === diameterLabels[diameterLabels.length - 1] ? `${a} Å` : `${a}`} height={0.2} position={[xr + 0.5, -spec.radius + a * NM_PER_ANGSTROM, 0]} />)}
  </group>;
}
