import { Enzyme3D } from "./Enzyme3D";
import { Follow } from "./motion";
import { TextLabel } from "./labels";

/** rRNA-rich subunits: large above the mRNA, small below (simplified shapes, not to scale). */
const LARGE = { seed: 311, radius: 1.9, stretch: [1.25, 0.82, 1] as const, color: "#b6a0e2" };
const SMALL = { seed: 97, radius: 1.35, stretch: [1.32, 0.52, 0.95] as const, color: "#e7b4c9" };

/**
 * Ribosome on an mRNA running along x through its origin. `codonLength` is
 * the width of one codon; the E, P and A sites sit one codon apart with P at
 * the origin. When not `assembled`, the subunits drift apart (initiation and
 * termination).
 */
export function Ribosome3D({ codonLength, assembled = true, showSites = false }: { codonLength: number; assembled?: boolean; showSites?: boolean }) {
  return <group>
    <Follow position={assembled ? [0, 1.62, -0.15] : [0.6, 4.2, -0.6]} scale={assembled ? 1 : 0.92} lambda={2.6}>
      <Enzyme3D seed={LARGE.seed} radius={LARGE.radius} stretch={LARGE.stretch} color={LARGE.color} opacity={assembled ? 0.5 : 0.32} groove={0.1} />
    </Follow>
    <Follow position={assembled ? [0, -1.0, 0.05] : [-0.6, -3.2, 0.4]} scale={assembled ? 1 : 0.92} lambda={2.6}>
      <Enzyme3D seed={SMALL.seed} radius={SMALL.radius} stretch={SMALL.stretch} color={SMALL.color} opacity={assembled ? 0.55 : 0.32} groove={0.08} />
    </Follow>
    {showSites && assembled && (["E", "P", "A"] as const).map((site, index) => (
      <TextLabel key={site} text={site} height={0.3} position={[(index - 1) * codonLength, -0.62, 1.15]} fill="rgba(255,255,255,0.9)" ink="#2c2148" depthTest={false} />
    ))}
  </group>;
}
