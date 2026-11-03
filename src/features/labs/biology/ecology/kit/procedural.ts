import * as THREE from "three";
import { ECO_COLORS } from "./eco-palette";

/** Seeded generator (Park–Miller), so every run and screenshot shows the same scene. */
export function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Vertex colours from each vertex position; the returned colour is copied at once and may be reused. */
export function paint(geometry: THREE.BufferGeometry, colorAt: (p: THREE.Vector3) => THREE.Color) {
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

/**
 * Soil block cut open at the front, layers painted by height between `top` and `base`:
 * an optional grass band, then topsoil, soil, clay and sand at the same proportions in every diorama.
 */
export function soilBlock(width: number, height: number, depth: number, centerY: number, { top, base, grass }: { top: number; base: number; grass: boolean }) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 1, 28, 1).translate(0, centerY, 0);
  const [green, soil, topsoil, clay, sand] = [ECO_COLORS.grass, ECO_COLORS.bankSoil, ECO_COLORS.topsoil, ECO_COLORS.clay, ECO_COLORS.sand].map((hex) => new THREE.Color(hex));
  const span = top - base, soilAt = top - 0.404 * span, clayAt = top - 0.83 * span;
  const c = new THREE.Color();
  return paint(geometry, ({ y }) => {
    if (grass && y > top - 0.14) return c.copy(green);
    if (y > soilAt) return c.copy(topsoil).lerp(soil, THREE.MathUtils.smoothstep(y, top - 0.3, soilAt));
    if (y > clayAt) return c.copy(soil).lerp(clay, THREE.MathUtils.smoothstep(y, soilAt, clayAt));
    return c.copy(clay).lerp(sand, THREE.MathUtils.smoothstep(y, clayAt, base));
  });
}
