import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAYOUT, useEmAnim } from "./anim";

const { axisY } = LAYOUT;
const { length, flangeRadius, boreRadius } = LAYOUT.coil;
const TURNS = 26;

/** Helix along the x axis, centred on the origin. */
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private radius: number, private span: number, private turns: number, private reverse = false) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const u = this.reverse ? 1 - t : t;
    const angle = u * this.turns * Math.PI * 2;
    return target.set(-this.span / 2 + u * this.span, Math.sin(angle) * this.radius, Math.cos(angle) * this.radius);
  }
}

/** A flange: a disc with a centre hole the magnet passes through. */
function flangeGeometry() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, flangeRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .028, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2, curveSegments: 48 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-.014, 0, 0);
  return geometry;
}

const ARROWS = 26;

/** Arrows riding along the outer winding while induced current flows; direction follows the level sign. */
function CurrentArrows({ curve }: { curve: HelixCurve }) {
  const anim = useEmAnim();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const scratch = useMemo(() => ({ point: new THREE.Vector3(), tangent: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), object: new THREE.Object3D() }), []);
  useFrame((_, delta) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const level = anim.current.level;
    const strength = Math.abs(level);
    instanced.visible = strength > .06;
    if (!instanced.visible) return;
    if (!anim.current.reduced) phase.current = (phase.current + Math.sign(level) * delta * .05 * strength + 1) % 1;
    const { point, tangent, up, object } = scratch;
    for (let i = 0; i < ARROWS; i++) {
      const u = (i / ARROWS + phase.current) % 1;
      curve.getPointAt(u, point);
      curve.getTangentAt(u, tangent);
      if (level < 0) tangent.negate();
      object.position.copy(point).multiplyScalar(1.16);
      object.position.x = point.x;
      object.quaternion.setFromUnitVectors(up, tangent);
      object.scale.setScalar(.7 + .3 * strength);
      object.updateMatrix();
      instanced.setMatrixAt(i, object.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, ARROWS]} frustumCulled={false} visible={false}>
    <coneGeometry args={[.026, .075, 12]} />
    <meshBasicMaterial color="#ffb020" toneMapped={false} />
  </instancedMesh>;
}

export function Coil3D() {
  const geometry = useMemo(() => {
    const inner = new HelixCurve(.198, length - .07, TURNS);
    const outer = new HelixCurve(.226, length - .07, TURNS, true);
    return {
      inner: new THREE.TubeGeometry(inner, TURNS * 22, .0125, 6, false),
      outer: new THREE.TubeGeometry(outer, TURNS * 22, .0125, 6, false),
      outerCurve: outer,
      flange: flangeGeometry(),
    };
  }, []);
  useEffect(() => () => { geometry.inner.dispose(); geometry.outer.dispose(); geometry.flange.dispose(); }, [geometry]);

  return <group position={[0, axisY, 0]}>
    {/* Enamelled copper winding: two layers */}
    {[geometry.inner, geometry.outer].map((tube, index) => <mesh key={index} geometry={tube} castShadow receiveShadow>
      <meshPhysicalMaterial color="#b4602c" metalness={1} roughness={.32} clearcoat={.7} clearcoatRoughness={.18} />
    </mesh>)}
    {/* Translucent bobbin tube and flanges */}
    <mesh rotation-z={Math.PI / 2}>
      <cylinderGeometry args={[boreRadius + .012, boreRadius + .012, length, 48, 1, true]} />
      <meshStandardMaterial color="#e9e3cf" roughness={.45} side={THREE.DoubleSide} />
    </mesh>
    {[-length / 2, length / 2].map((x) => <mesh key={x} geometry={geometry.flange} position-x={x} castShadow receiveShadow>
      <meshStandardMaterial color="#2c3135" roughness={.38} metalness={.05} />
    </mesh>)}
    {/* Wooden saddles under the flanges */}
    {[-length / 2 + .06, length / 2 - .06].map((x) => <mesh key={x} position={[x, -axisY + .1, 0]} castShadow receiveShadow>
      <boxGeometry args={[.1, .16, .5]} />
      <meshStandardMaterial color="#9a6a3f" roughness={.7} />
    </mesh>)}
    {/* Terminal block and brass posts in front */}
    <group position={[0, -axisY + .045, .36]}>
      <mesh castShadow receiveShadow><boxGeometry args={[.5, .05, .12]} /><meshStandardMaterial color="#20262a" roughness={.5} /></mesh>
      {[-.15, .15].map((x) => <group key={x} position={[x, .05, 0]}>
        <mesh castShadow><cylinderGeometry args={[.022, .026, .07, 16]} /><meshStandardMaterial color="#c9952f" metalness={.9} roughness={.25} /></mesh>
        <mesh position-y={.045}><cylinderGeometry args={[.034, .034, .022, 6]} /><meshStandardMaterial color="#b8862a" metalness={.9} roughness={.3} /></mesh>
      </group>)}
    </group>
    {/* Lead-out wires from the winding to the posts */}
    {[-1, 1].map((side) => <mesh key={side} position={[side * .2, -.16, .3]} rotation-x={-.55}>
      <cylinderGeometry args={[.008, .008, .3, 6]} />
      <meshStandardMaterial color="#b4602c" metalness={1} roughness={.35} />
    </mesh>)}
    <CurrentArrows curve={geometry.outerCurve} />
  </group>;
}
