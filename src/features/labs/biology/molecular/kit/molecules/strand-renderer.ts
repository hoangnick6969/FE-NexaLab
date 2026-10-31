import * as THREE from "three";
import { ATOMIC_RIBBON, BASE_COLORS, BASE_INK, STRAND_TINTS, type StrandTint } from "../k7-palette";
import { baseLength, NUCLEOTIDE, type NucleotidePose } from "../k7-geometry";
import { K7_MOTION, easeOutCubic } from "../k7-motion";
import type { Base } from "../k7-codons";

const letterTextures = new Map<string, THREE.CanvasTexture>();

/** Round chip with a base letter; drawn once per letter, no font download. */
export function letterTexture(letter: string, fill: string, ink: string) {
  const key = `${letter}|${fill}|${ink}`;
  const cached = letterTextures.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.fillStyle = fill;
  context.beginPath();
  context.arc(64, 64, 58, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = "rgba(255,255,255,0.85)";
  context.stroke();
  context.fillStyle = ink;
  context.font = `700 ${letter.length > 1 ? 50 : 76}px system-ui, "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(letter, 64, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  letterTextures.set(key, texture);
  return texture;
}

const matrix = new THREE.Matrix4();
const basis = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const spin = new THREE.Quaternion();
const scale = new THREE.Vector3();
const tangent = new THREE.Vector3();
const side = new THREE.Vector3();
const centre = new THREE.Vector3();
const start = new THREE.Vector3();
const control = new THREE.Vector3();
const toCamera = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_SPAWN = new THREE.Vector3(0.6, 1.4, 1.6);

export type StrandFrame = {
  poses: readonly NucleotidePose[];
  bases: readonly (Base | null)[];
  delta: number;
  reduced: boolean;
  labels: boolean;
  /** Letter chips on the plate (paired strands) or just beyond its edge (single strands). */
  labelAt?: "centre" | "tip";
  camera: THREE.Camera;
  /** Ball-and-stick view: only the backbone ribbon is drawn here; atoms come from AtomRenderer. */
  atomic?: boolean;
  /** Where a newly paired nucleotide flies in from (local space); defaults to beyond its base edge. */
  spawn?: (index: number, out: THREE.Vector3) => void;
};

/**
 * One polynucleotide strand as instanced parts (one draw call per part): a
 * glossy sugar–phosphate backbone tube with phosphate beads, pentagonal
 * deoxyribose/ribose plates and a coloured rod per base. Missing
 * (null) nucleotides are hidden, and a nucleotide that appears flies in from
 * the nucleoplasm and docks onto its pose. Presentation only.
 */
export class StrandRenderer {
  readonly group = new THREE.Group();
  private readonly capacity: number;
  private readonly sugars: THREE.InstancedMesh;
  private readonly phosphates: THREE.InstancedMesh;
  private readonly links: THREE.InstancedMesh;
  private readonly bases: THREE.InstancedMesh;
  private readonly sprites: THREE.Sprite[] = [];
  private readonly arrival: Float32Array;
  private readonly shown: (Base | null)[];
  private readonly geometries: THREE.BufferGeometry[];
  private readonly materials: THREE.Material[];
  private readonly color = new THREE.Color();
  private readonly placed: THREE.Vector3[];
  /** The first frame shows the strand as it is; only later changes fly in. */
  private primed = false;
  private readonly tubeColor: THREE.Color;
  private readonly linkMaterial: THREE.MeshPhysicalMaterial;
  private atomicShown = false;

  constructor(capacity: number, tint: StrandTint, clearcoat: boolean) {
    this.capacity = capacity;
    // Pentagon prism for the five-membered sugar ring, face across the strand.
    const sugarGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 5, 1).rotateX(Math.PI / 2);
    const phosphateGeometry = new THREE.SphereGeometry(0.078, 20, 14);
    const linkGeometry = new THREE.CylinderGeometry(0.052, 0.052, 1, 14, 1);
    linkGeometry.translate(0, 0.5, 0);
    // Base rod along local x (towards the partner strand).
    const baseGeometry = new THREE.CylinderGeometry(0.072, 0.072, 1, 16, 1).rotateZ(-Math.PI / 2);
    this.geometries = [sugarGeometry, phosphateGeometry, linkGeometry, baseGeometry];
    const coat = clearcoat ? { clearcoat: 1, clearcoatRoughness: 0.12 } : {};
    const sugarMaterial = new THREE.MeshPhysicalMaterial({ color: STRAND_TINTS[tint].tube, metalness: 0.35, roughness: 0.28, ...coat });
    const phosphateMaterial = new THREE.MeshPhysicalMaterial({ color: STRAND_TINTS[tint].bead, metalness: 0.2, roughness: 0.18, ...coat });
    this.tubeColor = new THREE.Color(STRAND_TINTS[tint].tube);
    const linkMaterial = new THREE.MeshPhysicalMaterial({ color: this.tubeColor, metalness: 0.55, roughness: 0.2, ...coat });
    const baseMaterial = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.26, ...coat });
    this.linkMaterial = linkMaterial;
    this.materials = [sugarMaterial, phosphateMaterial, linkMaterial, baseMaterial];
    this.sugars = new THREE.InstancedMesh(sugarGeometry, sugarMaterial, capacity);
    this.phosphates = new THREE.InstancedMesh(phosphateGeometry, phosphateMaterial, capacity);
    this.links = new THREE.InstancedMesh(linkGeometry, linkMaterial, capacity);
    this.bases = new THREE.InstancedMesh(baseGeometry, baseMaterial, capacity);
    for (const mesh of [this.sugars, this.phosphates, this.links, this.bases]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.bases.setColorAt(0, this.color.set("#ffffff"));
    this.arrival = new Float32Array(capacity).fill(1);
    this.shown = Array.from({ length: capacity }, () => null);
    this.placed = Array.from({ length: capacity }, () => new THREE.Vector3());
    for (let index = 0; index < capacity; index++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sprite.scale.setScalar(0.3);
      sprite.visible = false;
      sprite.renderOrder = 3;
      this.sprites.push(sprite);
      this.group.add(sprite);
    }
  }

  /** True once nucleotide `index` is present and has finished docking. */
  settled(index: number) {
    return this.shown[index] !== null && this.arrival[index] >= 1;
  }

  /** Base-plate centre of nucleotide `index` as last drawn (local space). */
  centreOf(index: number, out: THREE.Vector3) {
    return out.copy(this.placed[Math.min(index, this.capacity - 1)]);
  }

  /** Writes all instances for this frame; returns true while a nucleotide is still flying in. */
  update({ poses, bases, delta, reduced, labels, labelAt = "centre", camera, spawn, atomic = false }: StrandFrame) {
    if (atomic !== this.atomicShown) {
      this.atomicShown = atomic;
      this.linkMaterial.color.set(atomic ? ATOMIC_RIBBON : this.tubeColor);
      for (const mesh of [this.sugars, this.phosphates, this.bases]) mesh.visible = !atomic;
    }
    // The ribbon of the ball-and-stick view is thicker than the schematic tube.
    const ribbon = atomic ? 1.7 : 1;
    if (atomic) labels = false;
    const count = Math.min(poses.length, this.capacity);
    let moving = false;
    this.group.updateWorldMatrix(true, false);
    const cameraLocal = toCamera.copy(camera.position);
    this.group.worldToLocal(cameraLocal);
    if (!this.primed) {
      for (let index = 0; index < this.capacity; index++) this.shown[index] = index < count ? bases[index] ?? null : null;
      this.primed = true;
    }
    // Chips on the far side of the molecule fade so the near side reads clearly.
    const referenceDistance = cameraLocal.length();

    for (let index = 0; index < this.capacity; index++) {
      const base = index < count ? bases[index] ?? null : null;
      if (base !== this.shown[index]) {
        // A newly placed or replaced nucleotide animates in; removal is immediate.
        this.arrival[index] = base && !reduced ? 0 : 1;
        this.shown[index] = base;
      }
      const sprite = this.sprites[index];
      if (!base) {
        this.sugars.setMatrixAt(index, HIDDEN);
        this.phosphates.setMatrixAt(index, HIDDEN);
        this.links.setMatrixAt(index, HIDDEN);
        this.bases.setMatrixAt(index, HIDDEN);
        sprite.visible = false;
        continue;
      }
      const pose = poses[index];
      const t = this.arrival[index] < 1 ? (this.arrival[index] = Math.min(1, this.arrival[index] + (delta * 1000) / K7_MOTION.arrivalMs)) : 1;
      if (t < 1) moving = true;
      const eased = easeOutCubic(t);

      // Local frame: x along the base, y along the strand, z across.
      const previous = poses[Math.max(0, index - 1)].p;
      const next = poses[Math.min(count - 1, index + 1)].p;
      tangent.subVectors(next, previous);
      tangent.addScaledVector(pose.d, -tangent.dot(pose.d));
      if (tangent.lengthSq() < 1e-8) tangent.copy(UP);
      tangent.normalize();
      side.crossVectors(pose.d, tangent).normalize();
      basis.makeBasis(pose.d, tangent, side);
      quaternion.setFromRotationMatrix(basis);

      // Flight: quadratic Bézier from the spawn point, with a spin that settles.
      const target = centre.copy(pose.p);
      if (t < 1) {
        if (spawn) spawn(index, start); else start.copy(pose.p).addScaledVector(pose.d, -2.6).add(DEFAULT_SPAWN);
        control.lerpVectors(start, target, 0.5).y += 1.1;
        const u = eased;
        target.set(
          (1 - u) ** 2 * start.x + 2 * (1 - u) * u * control.x + u * u * pose.p.x,
          (1 - u) ** 2 * start.y + 2 * (1 - u) * u * control.y + u * u * pose.p.y,
          (1 - u) ** 2 * start.z + 2 * (1 - u) * u * control.z + u * u * pose.p.z,
        );
        quaternion.multiply(spin.setFromAxisAngle(pose.d, (1 - eased) * Math.PI * 1.5));
      }
      const grow = 0.55 + 0.45 * eased;

      this.sugars.setMatrixAt(index, matrix.compose(target, quaternion, scale.setScalar(grow)));

      // Base plate sits beyond the sugar, its length set by purine/pyrimidine.
      const length = baseLength(base);
      const plate = this.placed[index].copy(target).addScaledVector(pose.d, (NUCLEOTIDE.sugarOffset + length / 2) * grow);
      this.bases.setMatrixAt(index, matrix.compose(plate, quaternion, scale.set(length * grow, grow, grow)));
      this.bases.setColorAt(index, this.color.set(BASE_COLORS[base]));

      // Phosphate links this nucleotide to the previous one (5'→3'), only when both are in place.
      const linked = index > 0 && this.shown[index - 1] !== null && t >= 1 && this.arrival[index - 1] >= 1;
      if (linked) {
        const from = poses[index - 1].p;
        const span = start.subVectors(target, from);
        const distance = span.length();
        this.links.setMatrixAt(index, matrix.compose(from, spin.setFromUnitVectors(UP, span.normalize()), scale.set(ribbon, distance, ribbon)));
        this.phosphates.setMatrixAt(index, matrix.compose(control.lerpVectors(from, target, 0.5), quaternion, scale.setScalar(1)));
      } else {
        this.links.setMatrixAt(index, HIDDEN);
        // The 5' phosphate (or a docking nucleotide's own phosphate) rides on its sugar.
        this.phosphates.setMatrixAt(index, matrix.compose(control.copy(target).addScaledVector(tangent, -0.17), quaternion, scale.setScalar(grow)));
      }

      sprite.visible = labels;
      if (labels) {
        const material = sprite.material as THREE.SpriteMaterial;
        const map = letterTexture(base, BASE_COLORS[base], BASE_INK[base]);
        if (material.map !== map) { material.map = map; material.needsUpdate = true; }
        // Nudge the chip towards the camera so it reads in front of its plate.
        const far = start.subVectors(cameraLocal, plate).length() - referenceDistance;
        sprite.position.copy(plate).addScaledVector(start.normalize(), labelAt === "tip" ? 0.08 : 0.2);
        if (labelAt === "tip") sprite.position.addScaledVector(pose.d, (length / 2 + 0.2) * grow);
        sprite.scale.setScalar((labelAt === "tip" ? 0.27 : 0.22) * grow);
        material.opacity = 1 - 0.8 * Math.min(1, Math.max(0, (far + 0.15) / 0.9));
      }
    }
    for (const mesh of [this.sugars, this.phosphates, this.links, this.bases]) mesh.instanceMatrix.needsUpdate = true;
    if (this.bases.instanceColor) this.bases.instanceColor.needsUpdate = true;
    return moving;
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.sprites.forEach((sprite) => sprite.material.dispose());
    for (const mesh of [this.sugars, this.phosphates, this.links, this.bases]) mesh.dispose();
  }
}
