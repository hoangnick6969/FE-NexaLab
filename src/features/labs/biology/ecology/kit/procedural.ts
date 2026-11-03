import * as THREE from "three";

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
