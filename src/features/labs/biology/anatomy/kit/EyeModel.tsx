import { useEffect, useMemo, type ReactElement } from "react";
import * as THREE from "three";
import {
  OPTIC_DISC, RETINAL_VESSELS, ZONULE_SEGMENT,
  aqueousProfile, choroidProfile, ciliaryProfile, corneaProfile, fundusPoint, irisProfile, lensProfile, opticNervePath,
  rectusMusclePath, retinaProfile, scleraProfile, vitreousProfile,
  type Profile,
} from "./eye-geometry";

/** Part ids match `eyeParts` in the server model; the rubric uses these ids. */
export const EYE_PART_IDS = ["cornea", "aqueous", "pupil", "lens", "vitreous", "retina", "nerve", "sclera"] as const;
export type EyePartId = (typeof EYE_PART_IDS)[number];

const NERVE_ANCHOR = opticNervePath(22.6)[3];

/** Anchor for each label callout, in mm of the optical axis frame. */
export const EYE_PART_ANCHORS: Record<EyePartId, [number, number]> = {
  cornea: [2.7, 12.9],
  aqueous: [-2.4, 11.2],
  pupil: [0, 9.9],
  lens: [-3.2, 7.7],
  vitreous: [-3.2, 0.6],
  retina: [-6.6, -9.4],
  nerve: [NERVE_ANCHOR[0], NERVE_ANCHOR[1]],
  sclera: [-10.4, 6.3],
};

/** Radial segments per lathe. 64 keeps silhouettes smooth at the default zoom for half the triangles of 96. */
const LATHE_SEGMENTS = 64;

/** Millimetres to scene units. */
export const MM = 0.1;

/** Deterministic pseudo-random sequence so procedural textures render the same everywhere. */
function seeded(seed: number) {
  let state = seed;
  return () => ((state = (state * 16807) % 2147483647) / 2147483647);
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeatU = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(repeatU, 1);
  return texture;
}

/**
 * Iris on the lathe: u runs around the pupil, v from the pupil edge (0) to the root (1).
 * Blue-grey stroma with a golden collarette and radial fibres, as in the textbook figures.
 */
function irisTexture() {
  return canvasTexture(512, 128, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, "#1b1a1d");
    gradient.addColorStop(0.08, "#6b5032");
    gradient.addColorStop(0.24, "#9c7a45");
    gradient.addColorStop(0.36, "#4e7391");
    gradient.addColorStop(0.75, "#6f97b5");
    gradient.addColorStop(1, "#2f4659");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 128);
    const random = seeded(7);
    for (let i = 0; i < 420; i++) {
      const x = random() * 512;
      const light = random() > 0.45;
      ctx.strokeStyle = light ? `rgba(220,236,248,${(0.08 + random() * 0.18).toFixed(3)})` : `rgba(18,32,46,${(0.1 + random() * 0.2).toFixed(3)})`;
      ctx.lineWidth = 0.6 + random() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, 10 + random() * 20);
      ctx.lineTo(x + (random() - 0.5) * 6, 128);
      ctx.stroke();
    }
  });
}

/** Ciliary body: red radial folds (ciliary processes) around the lens. */
function ciliaryTexture() {
  return canvasTexture(64, 16, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 64, 0);
    gradient.addColorStop(0, "#b7322b");
    gradient.addColorStop(0.5, "#e6765e");
    gradient.addColorStop(1, "#b7322b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 16);
  }, 70);
}

/** Retina: orange-red fundus, darker towards the back pole. */
function retinaTexture() {
  return canvasTexture(4, 256, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#c9512f");
    gradient.addColorStop(0.35, "#e57d45");
    gradient.addColorStop(1, "#f5ad70");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 256);
  });
}

function useDisposable<T extends { dispose: () => void }>(create: () => T, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(create, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

function Lathe({ profile, material, onPick, name }: {
  profile: Profile;
  material: ReactElement;
  onPick?: () => void;
  name: string;
}) {
  // Profiles are rebuilt only when their inputs change (accommodation or axial length); the old geometry is freed.
  const geometry = useDisposable(
    () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * MM, y * MM)), LATHE_SEGMENTS),
    [JSON.stringify(profile)],
  );
  return (
    <mesh geometry={geometry} name={name} onClick={(event) => { event.stopPropagation(); onPick?.(); }}>
      {material}
    </mesh>
  );
}

function Tube({ points, radiusMm, segments = 48, radial = 8, material, onPick, name }: {
  points: Array<[number, number, number]>;
  radiusMm: number;
  segments?: number;
  radial?: number;
  material: ReactElement;
  onPick?: () => void;
  name: string;
}) {
  const geometry = useDisposable(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x * MM, y * MM, z * MM)));
    return new THREE.TubeGeometry(curve, segments, radiusMm * MM, radial, false);
  }, [JSON.stringify(points), radiusMm, segments, radial]);
  return (
    <mesh geometry={geometry} name={name} onClick={(event) => { event.stopPropagation(); onPick?.(); }}>
      {material}
    </mesh>
  );
}

function Zonules({ planes }: { planes: THREE.Plane[] }) {
  const geometry = useDisposable(() => {
    const [[r0, y0], [r1, y1]] = ZONULE_SEGMENT;
    const positions: number[] = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
      positions.push(r0 * cos * MM, y0 * MM, r0 * sin * MM, r1 * cos * MM, y1 * MM, r1 * sin * MM);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return buffer;
  }, []);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#f3ead7" transparent opacity={0.75} clippingPlanes={planes} />
    </lineSegments>
  );
}

export type EyeModelProps = {
  axialMm: number;
  accommodation: number;
  pupilMm: number;
  sectioned: boolean;
  highlight: EyePartId | null;
  onPick?: (id: EyePartId) => void;
  /** Hides the sclera and nerve to show the interior. */
  showInterior?: boolean;
};

/**
 * Anatomical eye built from lathe profiles and tubes, after the textbook
 * cross-section: sclera, choroid and retina layers; cornea, aqueous, lens and
 * vitreous transmissive with their own IOR; ciliary body with zonules; retinal
 * vessels from the optic disc; fovea at the back pole; optic nerve and two rectus
 * muscles outside. Highlight raises emissive light on the picked part only.
 */
export function EyeModel({ axialMm, accommodation, pupilMm, sectioned, highlight, onPick, showInterior = false }: EyeModelProps) {
  const planes = useMemo(() => (sectioned ? [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)] : []), [sectioned]);
  const iris = useMemo(() => irisTexture(), []);
  const ciliary = useMemo(() => ciliaryTexture(), []);
  const retina = useMemo(() => retinaTexture(), []);
  useEffect(() => () => { iris?.dispose(); ciliary?.dispose(); retina?.dispose(); }, [iris, ciliary, retina]);
  const glow = (id: EyePartId) => (highlight === id ? "#3f7d5c" : "#000000");
  const glowIntensity = (id: EyePartId) => (highlight === id ? 0.5 : 0);
  const pick = (id: EyePartId) => (onPick ? () => onPick(id) : undefined);
  const disc = fundusPoint(axialMm, OPTIC_DISC[0], OPTIC_DISC[1], 0.05);
  const fovea = fundusPoint(axialMm, 0, 0, 0.05);
  const vessels = RETINAL_VESSELS.map((vessel) => ({ ...vessel, path: vessel.points.map(([a, c]) => fundusPoint(axialMm, a, c, 0.12)) }));

  return (
    <group>
      <Lathe
        name="sclera"
        profile={scleraProfile(axialMm)}
        onPick={pick("sclera")}
        material={(
          <meshPhysicalMaterial
            color="#f7f3ec" roughness={0.38} clearcoat={0.35} clearcoatRoughness={0.35} sheen={0.3} sheenColor="#ffe9e0"
            side={THREE.DoubleSide} clippingPlanes={planes} emissive={glow("sclera")} emissiveIntensity={glowIntensity("sclera")}
            opacity={showInterior ? 0.25 : 1} transparent={showInterior}
          />
        )}
      />
      <Lathe
        name="choroid"
        profile={choroidProfile(axialMm)}
        onPick={pick("sclera")}
        material={<meshStandardMaterial color="#6e2016" roughness={0.7} side={THREE.DoubleSide} clippingPlanes={planes} />}
      />
      <Lathe
        name="retina"
        profile={retinaProfile(axialMm)}
        onPick={pick("retina")}
        material={(
          <meshStandardMaterial
            map={retina ?? undefined} color="#ffffff" roughness={0.55} side={THREE.DoubleSide} clippingPlanes={planes}
            emissive={glow("retina")} emissiveIntensity={glowIntensity("retina")}
          />
        )}
      />
      {vessels.map((vessel, index) => (
        <Tube
          key={index}
          name="retinal-vessel"
          points={vessel.path}
          radiusMm={vessel.radiusMm}
          segments={24}
          radial={6}
          onPick={pick("retina")}
          material={<meshStandardMaterial color={vessel.artery ? "#d8412f" : "#8e1f22"} roughness={0.4} clippingPlanes={planes} />}
        />
      ))}
      <mesh position={[disc[0] * MM, disc[1] * MM, disc[2] * MM]} scale={[1, 0.45, 1]} onClick={(event) => { event.stopPropagation(); onPick?.("retina"); }}>
        <sphereGeometry args={[0.08, 24, 16]} />
        <meshStandardMaterial color="#f4d58a" roughness={0.5} clippingPlanes={planes} />
      </mesh>
      <mesh position={[fovea[0] * MM, fovea[1] * MM, fovea[2] * MM]} scale={[1, 0.35, 1]} onClick={(event) => { event.stopPropagation(); onPick?.("retina"); }}>
        <sphereGeometry args={[0.055, 24, 16]} />
        <meshStandardMaterial color="#8c2414" roughness={0.6} clippingPlanes={planes} />
      </mesh>
      <Lathe
        name="cornea"
        profile={corneaProfile()}
        onPick={pick("cornea")}
        material={(
          <meshPhysicalMaterial
            color="#eef8ff" transmission={1} thickness={0.52} ior={1.376} roughness={0.02}
            specularIntensity={1} clearcoat={1} clearcoatRoughness={0.02} attenuationColor="#9fd3f2" attenuationDistance={3}
            side={THREE.DoubleSide} clippingPlanes={planes} emissive={glow("cornea")} emissiveIntensity={glowIntensity("cornea")}
          />
        )}
      />
      <Lathe
        name="aqueous"
        profile={aqueousProfile()}
        onPick={pick("aqueous")}
        material={(
          <meshPhysicalMaterial
            color="#dff3ff" transmission={0.95} thickness={0.6} ior={1.336} roughness={0.05}
            transparent opacity={0.4} side={THREE.DoubleSide} clippingPlanes={planes}
            emissive={glow("aqueous")} emissiveIntensity={glowIntensity("aqueous")}
          />
        )}
      />
      <Lathe
        name="iris"
        profile={irisProfile(pupilMm)}
        onPick={pick("pupil")}
        material={(
          <meshStandardMaterial
            map={iris ?? undefined} color="#ffffff" roughness={0.5} metalness={0}
            side={THREE.DoubleSide} clippingPlanes={planes} emissive={glow("pupil")} emissiveIntensity={glowIntensity("pupil")}
          />
        )}
      />
      <Lathe
        name="ciliary-body"
        profile={ciliaryProfile()}
        onPick={pick("lens")}
        material={<meshStandardMaterial map={ciliary ?? undefined} color="#ffffff" roughness={0.5} side={THREE.DoubleSide} clippingPlanes={planes} />}
      />
      <Zonules planes={planes} />
      <Lathe
        name="lens"
        profile={lensProfile(accommodation)}
        onPick={pick("lens")}
        material={(
          <meshPhysicalMaterial
            color="#fff7dc" transmission={0.92} thickness={0.6} ior={1.42} roughness={0.03} clearcoat={0.6}
            attenuationColor="#ffe6a8" attenuationDistance={8}
            side={THREE.DoubleSide} clippingPlanes={planes} emissive={glow("lens")} emissiveIntensity={glowIntensity("lens")}
          />
        )}
      />
      <Lathe
        name="vitreous"
        profile={vitreousProfile(axialMm)}
        onPick={pick("vitreous")}
        material={(
          <meshPhysicalMaterial
            color="#fff4ec" transmission={0.95} thickness={1.2} ior={1.336} roughness={0.12}
            transparent opacity={0.22} side={THREE.DoubleSide} clippingPlanes={planes}
            emissive={glow("vitreous")} emissiveIntensity={glowIntensity("vitreous")}
          />
        )}
      />
      <Tube
        name="optic-nerve"
        points={opticNervePath(axialMm)}
        radiusMm={1.5}
        segments={32}
        radial={16}
        onPick={pick("nerve")}
        material={(
          <meshStandardMaterial
            color="#ecb65f" roughness={0.55} side={THREE.DoubleSide} clippingPlanes={planes}
            emissive={glow("nerve")} emissiveIntensity={glowIntensity("nerve")}
          />
        )}
      />
      {([1, -1] as const).map((side) => (
        <Tube
          key={side}
          name="rectus-muscle"
          points={rectusMusclePath(axialMm, side)}
          radiusMm={1.05}
          segments={32}
          radial={10}
          onPick={pick("sclera")}
          material={<meshStandardMaterial color="#c2392d" roughness={0.55} side={THREE.DoubleSide} clippingPlanes={planes} />}
        />
      ))}
    </group>
  );
}
