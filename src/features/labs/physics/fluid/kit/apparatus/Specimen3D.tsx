import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { K3Material, K3Specimen } from "../k3-config";

/** Small seeded PRNG so a pebble's shape is stable for its specimen seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function meshVolume(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let volume = 0;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(position, index ? index.getX(i) : i);
    b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
    volume += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(volume);
}

/**
 * Elongated, seeded pebble whose width fits the stated maximum and whose drawn
 * volume matches the specimen volume, so displacement looks right. Long axis is x.
 */
function pebbleGeometry(specimen: Extract<K3Specimen, { shape: "irregular" }>, cylinderInnerRadiusMm?: number) {
  const random = mulberry32(specimen.seed);
  const geometry = new THREE.IcosahedronGeometry(1, 5);
  const position = geometry.getAttribute("position");
  const bumps = Array.from({ length: 6 }, () => ({
    direction: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
    strength: 0.04 + random() * 0.06,
  }));
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const bump = bumps.reduce((sum, item) => sum + item.strength * Math.pow(Math.max(0, p.dot(item.direction)), 3), 0);
    p.multiplyScalar(1 + bump);
    position.setXYZ(i, p.x, p.y * 0.86, p.z);
  }
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const halfWidth = Math.max(box.max.y - box.min.y, box.max.z - box.min.z) / 2;
  const radial = (specimen.maxWidthMm * 0.96) / 2 / halfWidth;
  geometry.scale(1, radial, radial);
  const targetMm3 = specimen.volumeMl * 1000;
  geometry.scale(targetMm3 / meshVolume(geometry), 1, 1);
  if (cylinderInnerRadiusMm !== undefined) {
    // Align the long axis with the bore. Measure every vertex, not just its AABB:
    // diagonal bumps must fit too. Reciprocal Y scaling preserves mesh volume.
    geometry.rotateZ(Math.PI / 2);
    geometry.computeBoundingBox();
    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, 0, -center.z);
    let radius = 0;
    for (let i = 0; i < position.count; i++) radius = Math.max(radius, Math.hypot(position.getX(i), position.getZ(i)));
    const fit = Math.min(1, 0.78 * cylinderInnerRadiusMm / radius);
    geometry.scale(fit, 1 / (fit * fit), fit);
  }
  geometry.computeBoundingBox();
  geometry.translate(0, -geometry.boundingBox!.min.y, 0);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  return geometry;
}

function useWoodTexture(enabled: boolean, color: string) {
  const texture = useMemo(() => {
    if (!enabled) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);
    const random = mulberry32(7);
    for (let i = 0; i < 70; i++) {
      const y = random() * 512;
      ctx.strokeStyle = `rgba(92, 58, 28, ${0.05 + random() * 0.12})`;
      ctx.lineWidth = 1 + random() * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x / 70 + i) * 6 + (random() - 0.5) * 3);
      ctx.stroke();
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, [enabled, color]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/** A specimen resting on its group origin (mm units). Pure presentation of the configured object. */
export function Specimen3D({ specimen, material, cylinderInnerRadiusMm }: { specimen: K3Specimen; material: K3Material; cylinderInnerRadiusMm?: number }) {
  const wood = useWoodTexture(material.kind === "wood", material.appearance.color);
  const pebble = useMemo(() => {
    if (specimen.shape !== "irregular") return null;
    const geometry = pebbleGeometry(specimen, cylinderInnerRadiusMm);
    geometry.computeBoundingBox();
    return { geometry, lift: -geometry.boundingBox!.min.y };
  }, [specimen, cylinderInnerRadiusMm]);
  useEffect(() => () => pebble?.geometry.dispose(), [pebble]);
  const surface = <meshStandardMaterial
    color={wood ? "#ffffff" : material.appearance.color}
    map={wood}
    roughness={material.appearance.roughness}
    metalness={material.appearance.metalness}
  />;
  if (specimen.shape === "box") {
    const [x, y, z] = specimen.sizeMm;
    return <RoundedBox args={[x, z, y]} radius={Math.min(1.2, Math.min(x, y, z) / 8)} smoothness={3} position={[0, z / 2, 0]} castShadow receiveShadow>
      {surface}
    </RoundedBox>;
  }
  return <mesh geometry={pebble!.geometry} position={[0, pebble!.lift, 0]} name={`specimen-${specimen.id}`} castShadow receiveShadow>{surface}</mesh>;
}
