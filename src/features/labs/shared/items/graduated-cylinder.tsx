/**
 * Shared graduated cylinder: a tall, narrow glass tube on a hexagonal foot, with a printed scale and an optional liquid column.
 * The bench passes the size, how full it is and how the liquid looks. The capacity, the volume and the scale labels
 * ("mL", "50") stay with the bench (labels go in `children`); this item only draws evenly spaced marks.
 */
import type { ReactNode } from "react";
import { SHARED_ITEM_META } from "./catalog";
import { GLASS, LiquidColumn, type LiquidLook } from "./glass";
import type { SharedLabItem } from "./item";
import { CYLINDER_DEFAULT_DIVISIONS, CYLINDER_DEFAULT_SIZE, CYLINDER_FLOOR, cylinderAnchors, cylinderInnerHeight, cylinderMarkHeights, type CylinderSize } from "./item-layout";

export { CYLINDER_DEFAULT_SIZE, cylinderAnchors, cylinderInnerHeight, cylinderMarkHeights, type CylinderSize };

const DEFAULT_MAJOR_EVERY = 5;

export type GraduatedCylinderProps = Partial<CylinderSize> & {
  /** 0–1 of the inner height, already mapped by the bench from its own volume. */
  fill: number;
  /** Liquid appearance; not drawn while `fill` is 0. */
  liquid: LiquidLook;
  /** Number of equal scale intervals between the floor and full scale. Default 10. */
  divisions?: number;
  /** Every n-th mark is drawn longer. Default 5. */
  majorEvery?: number;
  children?: ReactNode;
};

export function GraduatedCylinder3D({
  radius = CYLINDER_DEFAULT_SIZE.radius, height = CYLINDER_DEFAULT_SIZE.height, fill, liquid, divisions = CYLINDER_DEFAULT_DIVISIONS, majorEvery = DEFAULT_MAJOR_EVERY, children,
}: GraduatedCylinderProps) {
  const size = { radius, height };
  const marks = cylinderMarkHeights(size, divisions);
  return <group>
    <mesh position={[0, 0.0125, 0]} castShadow receiveShadow><cylinderGeometry args={[radius * 1.7, radius * 1.9, 0.025, 6]} /><meshStandardMaterial color="#2f6fb0" roughness={0.45} /></mesh>
    <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[radius, radius, height, 32, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
    <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.005, 8, 32]} /><meshStandardMaterial color="#bae6fd" roughness={0.2} transparent opacity={0.85} /></mesh>
    {marks.map((y, index) => {
      const major = (index + 1) % Math.max(1, majorEvery) === 0;
      // Marks stay narrow and centred on the front so they hug the curved wall.
      const length = major ? radius * 0.6 : radius * 0.35;
      return <mesh key={index} position={[0, y, radius * 1.005]}><boxGeometry args={[length, 0.003, 0.002]} /><meshStandardMaterial color="#1c3e78" /></mesh>;
    })}
    <LiquidColumn fullHeight={cylinderInnerHeight(size)} y0={CYLINDER_FLOOR} rBottom={radius * 0.92} rTop={radius * 0.92} fill={fill} look={liquid} />
    {children}
  </group>;
}

export const graduatedCylinderItem: SharedLabItem<GraduatedCylinderProps> = { ...SHARED_ITEM_META["graduated-cylinder"], Component3D: GraduatedCylinder3D, anchors: cylinderAnchors() };
