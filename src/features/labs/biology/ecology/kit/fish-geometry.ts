import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ECO_COLORS } from "./eco-palette";

/**
 * Procedural cá rô phi (Nile tilapia), head along +x, about 1 unit long:
 * a deep, laterally compressed body with faint vertical bars, a long spiny
 * dorsal fin, a truncate tail and small pectorals. Illustrative, not to scale.
 */
const HALF = 0.5;
/** Body taper along x: full depth behind the head, narrow caudal peduncle. */
const taper = (x: number) => (x < 0 ? 1 - 0.66 * Math.pow(-x / HALF, 1.5) : 1 - 0.3 * Math.pow(x / HALF, 2.2));
/** Half the body height at x (top of the back is a little higher than the belly is low). */
export const bodyTop = (x: number) => 0.2 * taper(x) * Math.sqrt(Math.max(0, 1 - (x / HALF) ** 2)) + 0.012;

function paint(geometry: THREE.BufferGeometry, colorAt: (p: THREE.Vector3) => THREE.Color) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const c = colorAt(p.fromBufferAttribute(position, i));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function finShape(points: Array<[number, number]>) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 4);
}

export function createTilapiaGeometry() {
  const c = Object.fromEntries(Object.entries(ECO_COLORS).map(([key, value]) => [key, new THREE.Color(value)])) as Record<keyof typeof ECO_COLORS, THREE.Color>;
  const mix = new THREE.Color();

  const body = new THREE.SphereGeometry(HALF, 48, 24);
  const position = body.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const k = taper(v.x);
    // Deep body (0.4 of the length), thin sides (0.15), snout slightly lower than the back.
    v.y = v.y * 0.4 * k + (v.y > 0 ? 0.012 : 0) - (v.x > 0.3 ? (v.x - 0.3) * 0.12 : 0);
    v.z *= 0.15 * k;
    position.setXYZ(i, v.x, v.y, v.z);
  }
  body.computeVertexNormals();
  paint(body, (p) => {
    const depth = Math.max(0.02, bodyTop(p.x));
    const ny = THREE.MathUtils.clamp(p.y / depth, -1, 1);
    mix.copy(c.fishBelly).lerp(c.fishSide, THREE.MathUtils.smoothstep(ny, -0.75, -0.1)).lerp(c.fishBack, THREE.MathUtils.smoothstep(ny, 0.25, 0.85));
    // Faint vertical bars on the flank, typical of the species.
    const bar = p.x < 0.28 && p.x > -0.4 && ny > -0.45 && Math.sin((p.x + 0.5) * 30) > 0.55;
    if (bar) mix.lerp(c.fishBar, 0.45);
    // Gill cover edge.
    if (Math.abs(p.x - 0.27) < 0.012 && ny < 0.6) mix.lerp(c.fishBar, 0.6);
    return mix.clone();
  });

  const finColor = (edge: (p: THREE.Vector3) => number) => (p: THREE.Vector3) => mix.copy(c.fishFin).lerp(c.fishFinEdge, THREE.MathUtils.smoothstep(edge(p), 0.55, 1)).clone();
  const tailX = -0.47;
  const tail = finShape([[tailX, 0.03], [-0.6, 0.17], [-0.72, 0.2], [-0.74, 0], [-0.72, -0.2], [-0.6, -0.17], [tailX, -0.03]]);
  paint(tail, finColor((p) => (tailX - p.x) / 0.27));
  // Dorsal: a long fin from behind the head to the peduncle, spiny at the front.
  const dorsalPoints: Array<[number, number]> = [];
  for (let i = 0; i <= 14; i++) {
    const x = 0.2 - i * 0.045;
    const spine = i < 9 ? (i % 2 ? 0.07 : 0.1) : 0.13 - (i - 9) * 0.012;
    dorsalPoints.push([x, bodyTop(x) - 0.01 + spine]);
  }
  for (let i = 14; i >= 0; i--) { const x = 0.2 - i * 0.045; dorsalPoints.push([x, bodyTop(x) - 0.03]); }
  const dorsal = finShape(dorsalPoints);
  paint(dorsal, finColor((p) => (p.y - bodyTop(p.x)) / 0.12));
  const anal = finShape([[-0.08, -bodyTop(-0.08) + 0.03], [-0.18, -bodyTop(-0.18) - 0.09], [-0.36, -bodyTop(-0.36) - 0.08], [-0.4, -bodyTop(-0.4) + 0.02]]);
  paint(anal, finColor((p) => (-bodyTop(p.x) - p.y) / 0.09));
  const pectoral = (side: 1 | -1) => {
    const fin = finShape([[0, 0], [-0.13, 0.05], [-0.15, -0.02], [-0.05, -0.05]]);
    fin.rotateX(side * 0.5).rotateY(side * 0.45).translate(0.2, -0.05, side * 0.055);
    return paint(fin, finColor((p) => (0.2 - p.x) / 0.15));
  };
  const eye = (side: 1 | -1) => paint(new THREE.SphereGeometry(0.03, 12, 8).translate(0.37, 0.035, side * 0.052), () => c.fishEye);

  const parts = [body, tail, dorsal, anal, pectoral(1), pectoral(-1), eye(1), eye(-1)];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((part) => part.dispose());
  merged.computeBoundingSphere();
  return merged;
}
