import { useEffect, useMemo, type ReactElement } from "react";
import * as THREE from "three";
import {
  aqueousProfile, corneaProfile, irisProfile, lensProfile, posteriorPoint, retinaProfile, scleraProfile, vitreousProfile,
  type Profile,
} from "./eye-geometry";

/** Part ids match `eyeParts` in the server model; the rubric uses these ids. */
export const EYE_PART_IDS = ["cornea", "aqueous", "pupil", "lens", "vitreous", "retina", "nerve", "sclera"] as const;
export type EyePartId = (typeof EYE_PART_IDS)[number];

/** Anchor for each label callout, in mm of the optical axis frame. */
export const EYE_PART_ANCHORS: Record<EyePartId, [number, number]> = {
  cornea: [2.7, 12.9],
  aqueous: [-2.4, 11.2],
  pupil: [0, 9.9],
  lens: [-3.2, 7.7],
  vitreous: [3.2, 0.6],
  retina: [-6.6, -9.9],
  nerve: [1.9, -15.6],
  sclera: [10.4, 6.3],
};

/** Radial segments per lathe. 64 keeps silhouettes smooth at the default zoom for half the triangles of 96. */
const LATHE_SEGMENTS = 64;

/** Millimetres to scene units. */
export const MM = 0.1;

/** Seeded so the iris texture is identical on every render and in tests. */
function irisTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, "#1d1410");
  gradient.addColorStop(0.18, "#5a3d22");
  gradient.addColorStop(0.55, "#8a6336");
  gradient.addColorStop(1, "#3c3f2a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 4);
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) {
    const x = random() * 256;
    ctx.fillStyle = `rgba(${random() > 0.5 ? "255,226,170" : "20,12,6"},${(0.05 + random() * 0.12).toFixed(3)})`;
    ctx.fillRect(x, 0, 0.6 + random() * 1.4, 4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Lathe({ profile, material, onPick, name }: {
  profile: Profile;
  material: ReactElement;
  onPick?: () => void;
  name: string;
}) {
  const geometry = useMemo(
    () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * MM, y * MM)), LATHE_SEGMENTS),
    // Profiles are rebuilt only when their inputs change (accommodation or axial length).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(profile)],
  );
  // A new profile (lens bulge, axial length) builds a new geometry; free the old one on the GPU.
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} name={name} onClick={(event) => { event.stopPropagation(); onPick?.(); }}>
      {material}
    </mesh>
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
 * Anatomical eye built from lathe profiles. Materials follow the optical role:
 * cornea, aqueous, lens and vitreous are transmissive with their own IOR;
 * sclera and retina are opaque. Highlight raises emissive light on one part only.
 */
export function EyeModel({ axialMm, accommodation, pupilMm, sectioned, highlight, onPick, showInterior = false }: EyeModelProps) {
  const planes = useMemo(() => (sectioned ? [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)] : []), [sectioned]);
  const iris = useMemo(() => irisTexture(), []);
  const glow = (id: EyePartId) => (highlight === id ? "#3f7d5c" : "#000000");
  const glowIntensity = (id: EyePartId) => (highlight === id ? 0.5 : 0);
  const [backX, backY] = posteriorPoint(axialMm, 0.087);
  const pick = (id: EyePartId) => (onPick ? () => onPick(id) : undefined);

  return (
    <group>
      <Lathe
        name="sclera"
        profile={scleraProfile(axialMm)}
        onPick={pick("sclera")}
        material={(
          <meshPhysicalMaterial
            color="#f1ece1" roughness={0.42} clearcoat={0.25} clearcoatRoughness={0.4}
            side={THREE.DoubleSide} clippingPlanes={planes} emissive={glow("sclera")} emissiveIntensity={glowIntensity("sclera")}
            opacity={showInterior ? 0.25 : 1} transparent={showInterior}
          />
        )}
      />
      <Lathe
        name="cornea"
        profile={corneaProfile()}
        onPick={pick("cornea")}
        material={(
          <meshPhysicalMaterial
            color="#ffffff" transmission={1} thickness={0.52} ior={1.376} roughness={0.02}
            specularIntensity={1} clearcoat={1} clearcoatRoughness={0.02} attenuationColor="#d6f0ff" attenuationDistance={6}
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
            color="#e6f7ff" transmission={0.95} thickness={0.6} ior={1.336} roughness={0.05}
            transparent opacity={0.45} side={THREE.DoubleSide} clippingPlanes={planes}
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
            map={iris ?? undefined} color="#ffffff" roughness={0.45} metalness={0}
            side={THREE.DoubleSide} clippingPlanes={planes} emissive={glow("pupil")} emissiveIntensity={glowIntensity("pupil")}
          />
        )}
      />
      <Lathe
        name="lens"
        profile={lensProfile(accommodation)}
        onPick={pick("lens")}
        material={(
          <meshPhysicalMaterial
            color="#fff4cf" transmission={0.9} thickness={0.5} ior={1.42} roughness={0.04}
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
            color="#eaf4ff" transmission={0.95} thickness={1.2} ior={1.336} roughness={0.1}
            transparent opacity={0.35} side={THREE.DoubleSide} clippingPlanes={planes}
            emissive={glow("vitreous")} emissiveIntensity={glowIntensity("vitreous")}
          />
        )}
      />
      <Lathe
        name="retina"
        profile={retinaProfile(axialMm)}
        onPick={pick("retina")}
        material={(
          <meshStandardMaterial
            color="#c8583f" roughness={0.6} side={THREE.DoubleSide} clippingPlanes={planes}
            emissive={glow("retina")} emissiveIntensity={glowIntensity("retina")}
          />
        )}
      />
      <mesh position={[backX * MM, backY * MM, 0]} onClick={(event) => { event.stopPropagation(); onPick?.("retina"); }}>
        <sphereGeometry args={[0.045, 24, 16]} />
        <meshStandardMaterial color="#e2b65c" roughness={0.5} clippingPlanes={planes} />
      </mesh>
      <mesh
        position={[0, (-(axialMm - 11) - 4.5) * MM, 0]}
        onClick={(event) => { event.stopPropagation(); onPick?.("nerve"); }}
      >
        <cylinderGeometry args={[0.13, 0.13, 0.9, 40]} />
        <meshStandardMaterial
          color="#e8d6a6" roughness={0.5} clippingPlanes={planes}
          emissive={glow("nerve")} emissiveIntensity={glowIntensity("nerve")}
        />
      </mesh>
    </group>
  );
}
