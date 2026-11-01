import * as THREE from "three";
import { isPurine, type Base } from "../k7-codons";
import { NUCLEOTIDE, baseLength, type NucleotidePose } from "../k7-geometry";
import { ELEMENT_COLORS, type Element } from "../k7-palette";

/**
 * Ball-and-stick nucleotides (illustrative, not crystallographic): phosphate
 * group, five-membered sugar ring and the base ring system with its key
 * exocyclic atoms, coloured by element (C grey, N blue, O red, P orange).
 * Rings lie across the strand so neighbouring bases stack; the base reaches
 * the same tip as the schematic rod, so hydrogen bonds line up in both views.
 */
type Atom = { el: Element; at: THREE.Vector3 };
type Template = { atoms: Atom[]; bonds: [number, number][]; phosphorus: number; c3: number };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const RADIUS: Record<Element, number> = { C: 0.05, N: 0.052, O: 0.058, P: 0.078 };

function ring(centre: THREE.Vector3, radius: number, startDeg: number, count: number) {
  return Array.from({ length: count }, (_, k) => {
    const a = THREE.MathUtils.degToRad(startDeg + (360 / count) * k);
    return v(centre.x + radius * Math.cos(a), 0, centre.z + radius * Math.sin(a));
  });
}

function buildTemplate(base: Base): Template {
  const atoms: Atom[] = [];
  const bonds: [number, number][] = [];
  const add = (el: Element, at: THREE.Vector3) => atoms.push({ el, at }) - 1;
  const bond = (a: number, b: number) => bonds.push([a, b]);

  // Sugar ring (C1' points at the base) and C5'.
  const sugar = ring(v(0, 0, 0), 0.11, 0, 5);
  const [c1, c2, c3, c4, o4] = [add("C", sugar[0]), add("C", sugar[1]), add("C", sugar[2]), add("C", sugar[3]), add("O", sugar[4])];
  bond(c1, c2); bond(c2, c3); bond(c3, c4); bond(c4, o4); bond(o4, c1);
  // 5' phosphate group sits towards the previous nucleotide (−y).
  const pAt = v(-0.19, -0.17, -0.06);
  const p = add("P", pAt);
  const o5 = add("O", pAt.clone().add(v(0.05, 0.08, -0.03)));
  const c5 = add("C", v(-0.14, -0.04, -0.12));
  bond(c4, c5); bond(c5, o5); bond(o5, p);
  bond(p, add("O", pAt.clone().add(v(-0.12, 0.01, 0.06))));
  bond(p, add("O", pAt.clone().add(v(-0.06, 0.02, -0.12))));
  bond(p, add("O", pAt.clone().add(v(0.03, -0.12, 0.06)))); // O3' of the previous residue

  // Base, attached by its glycosidic N.
  const start = atoms.length;
  const attach = 0.24;
  const ringAtoms: number[] = [];
  const exo = (from: number, el: Element, centre: THREE.Vector3) => {
    const out = atoms[from].at.clone().sub(centre).setY(0).normalize().multiplyScalar(0.12);
    bond(from, add(el, atoms[from].at.clone().add(out)));
  };
  if (isPurine(base)) {
    const five = ring(v(attach + 0.085, 0, 0), 0.085, 180, 5); // N9 C8 N7 C5 C4
    const [n9, c8, n7, c5b, c4b] = five.map((at, k) => add(k === 0 || k === 2 ? "N" : "C", at));
    ringAtoms.push(n9, c8, n7, c5b, c4b);
    bond(n9, c8); bond(c8, n7); bond(n7, c5b); bond(c5b, c4b); bond(c4b, n9);
    // Six-membered ring fused on the C4–C5 edge, away from the imidazole.
    const a = atoms[c4b].at, b = atoms[c5b].at;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const centre5 = v(attach + 0.085, 0, 0);
    const outward = mid.clone().sub(centre5).setY(0).normalize();
    const edge = a.distanceTo(b);
    const centre6 = mid.clone().addScaledVector(outward, edge * Math.sqrt(3) / 2);
    const startDeg = THREE.MathUtils.radToDeg(Math.atan2(b.z - centre6.z, b.x - centre6.x));
    const six = ring(centre6, edge, startDeg, 6); // C5, C6, N1, C2, N3, C4 (around)
    const c6 = add("C", six[1]), n1 = add("N", six[2]), c2b = add("C", six[3]), n3 = add("N", six[4]);
    ringAtoms.push(c6, n1, c2b, n3);
    bond(c5b, c6); bond(c6, n1); bond(n1, c2b); bond(c2b, n3); bond(n3, c4b);
    if (base === "A") exo(c6, "N", centre6);
    else { exo(c6, "O", centre6); exo(c2b, "N", centre6); }
  } else {
    const centre = v(attach + 0.14, 0, 0);
    const six = ring(centre, 0.14, 180, 6); // N1 C2 N3 C4 C5 C6
    const ids = six.map((at, k) => add(k === 0 || k === 2 ? "N" : "C", at));
    ringAtoms.push(...ids);
    ids.forEach((id, k) => bond(id, ids[(k + 1) % 6]));
    exo(ids[1], "O", centre);
    exo(ids[3], base === "C" ? "N" : "O", centre);
    if (base === "T") exo(ids[4], "C", centre);
  }
  bond(c1, start);
  // Stretch the base so its far ring edge meets the schematic rod tip.
  const tip = NUCLEOTIDE.sugarOffset + baseLength(base);
  const far = Math.max(...ringAtoms.map((id) => atoms[id].at.x));
  const k = (tip - attach) / (far - attach);
  for (let id = start; id < atoms.length; id++) {
    const at = atoms[id].at;
    at.set(attach + (at.x - attach) * k, at.y, at.z * k);
  }
  return { atoms, bonds, phosphorus: p, c3 };
}

const templates = new Map<Base, Template>();
const templateFor = (base: Base) => templates.get(base) ?? templates.set(base, buildTemplate(base)).get(base)!;
const MAX_ATOMS = 34;
const MAX_BONDS = 40;

const basis = new THREE.Matrix4();
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const tangent = new THREE.Vector3();
const side = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const dir = new THREE.Vector3();
const scale = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

export class AtomRenderer {
  readonly group = new THREE.Group();
  private readonly capacity: number;
  private readonly atoms: THREE.InstancedMesh;
  private readonly bonds: THREE.InstancedMesh;
  private readonly frames: THREE.Matrix4[];
  private readonly color = new THREE.Color();

  constructor(capacity: number) {
    this.capacity = capacity;
    this.atoms = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 }), capacity * MAX_ATOMS);
    const bondGeometry = new THREE.CylinderGeometry(0.017, 0.017, 1, 8, 1).translate(0, 0.5, 0);
    this.bonds = new THREE.InstancedMesh(bondGeometry, new THREE.MeshStandardMaterial({ color: "#d9dee2", roughness: 0.4, metalness: 0.2 }), capacity * (MAX_BONDS + 1));
    for (const mesh of [this.atoms, this.bonds]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.atoms.setColorAt(0, this.color.set("#ffffff"));
    this.frames = Array.from({ length: capacity }, () => new THREE.Matrix4());
  }

  update(poses: readonly NucleotidePose[], bases: readonly (Base | null)[]) {
    const count = Math.min(poses.length, this.capacity);
    for (let index = 0; index < this.capacity; index++) {
      const base = index < count ? bases[index] ?? null : null;
      const atomOffset = index * MAX_ATOMS, bondOffset = index * (MAX_BONDS + 1);
      if (!base) {
        for (let k = 0; k < MAX_ATOMS; k++) this.atoms.setMatrixAt(atomOffset + k, HIDDEN);
        for (let k = 0; k <= MAX_BONDS; k++) this.bonds.setMatrixAt(bondOffset + k, HIDDEN);
        continue;
      }
      const pose = poses[index];
      tangent.subVectors(poses[Math.min(count - 1, index + 1)].p, poses[Math.max(0, index - 1)].p);
      tangent.addScaledVector(pose.d, -tangent.dot(pose.d));
      if (tangent.lengthSq() < 1e-8) tangent.copy(UP);
      tangent.normalize();
      side.crossVectors(pose.d, tangent).normalize();
      basis.makeBasis(pose.d, tangent, side).setPosition(pose.p);
      this.frames[index].copy(basis);
      const template = templateFor(base);
      template.atoms.forEach((atom, k) => {
        a.copy(atom.at).applyMatrix4(basis);
        this.atoms.setMatrixAt(atomOffset + k, matrix.compose(a, quaternion.identity(), scale.setScalar(RADIUS[atom.el])));
        this.atoms.setColorAt(atomOffset + k, this.color.set(ELEMENT_COLORS[atom.el]));
      });
      for (let k = template.atoms.length; k < MAX_ATOMS; k++) this.atoms.setMatrixAt(atomOffset + k, HIDDEN);
      const write = (slot: number) => {
        dir.subVectors(b, a);
        const length = dir.length();
        this.bonds.setMatrixAt(slot, matrix.compose(a, quaternion.setFromUnitVectors(UP, dir.normalize()), scale.set(1, length, 1)));
      };
      template.bonds.forEach(([i, j], k) => {
        a.copy(template.atoms[i].at).applyMatrix4(basis);
        b.copy(template.atoms[j].at).applyMatrix4(basis);
        write(bondOffset + k);
      });
      for (let k = template.bonds.length; k < MAX_BONDS; k++) this.bonds.setMatrixAt(bondOffset + k, HIDDEN);
      // Phosphodiester bond to the previous residue's C3'.
      const previous = index > 0 ? bases[index - 1] : null;
      if (previous) {
        a.copy(template.atoms[template.phosphorus].at).applyMatrix4(basis);
        const prev = templateFor(previous);
        b.copy(prev.atoms[prev.c3].at).applyMatrix4(this.frames[index - 1]);
        write(bondOffset + MAX_BONDS);
      } else this.bonds.setMatrixAt(bondOffset + MAX_BONDS, HIDDEN);
    }
    this.atoms.instanceMatrix.needsUpdate = true;
    this.bonds.instanceMatrix.needsUpdate = true;
    if (this.atoms.instanceColor) this.atoms.instanceColor.needsUpdate = true;
  }

  dispose() {
    for (const mesh of [this.atoms, this.bonds]) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); }
  }
}
