import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EmDragKind, EmManual } from "../manual";

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
const CLICK_SLOP = 4; // pixels a pointer may move and still count as a click

/**
 * Pointer handlers for dragging one apparatus part over the horizontal plane at `planeY`.
 * The move is followed on the window, so the pointer may leave the part; orbiting is paused meanwhile.
 * A press that barely moves is a click and calls `onClick` instead.
 */
export function useBenchDrag({ manual, kind, planeY, onGrab, onMove, onClick }: {
  manual: EmManual | undefined;
  kind: EmDragKind;
  planeY: number;
  onGrab: (point: THREE.Vector3) => void;
  onMove: (point: THREE.Vector3) => void;
  onClick: () => void;
}) {
  const { camera, gl, controls } = useThree((state) => ({ camera: state.camera, gl: state.gl, controls: state.controls as { enabled: boolean } | null }));
  const project = (event: PointerEvent | { clientX: number; clientY: number }) => {
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    plane.constant = -planeY;
    return raycaster.ray.intersectPlane(plane, hit);
  };
  const enabled = Boolean(manual?.can[kind]);
  return {
    enabled,
    onPointerDown: (event: { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      if (!manual || !enabled) return;
      event.stopPropagation();
      const down = event.nativeEvent;
      const point = project(down);
      if (!point || !manual.start(kind)) return;
      onGrab(point.clone());
      if (controls) controls.enabled = false;
      let moved = false;
      const move = (next: PointerEvent) => {
        if (next.pointerId !== down.pointerId) return;
        if (!moved && Math.hypot(next.clientX - down.clientX, next.clientY - down.clientY) < CLICK_SLOP) return;
        moved = true;
        const at = project(next);
        if (at) onMove(at);
      };
      const up = (next: PointerEvent) => {
        if (next.pointerId !== down.pointerId) return;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (controls) controls.enabled = true;
        manual.end();
        if (!moved && next.type === "pointerup") onClick();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    onPointerOver: () => { if (enabled) document.body.style.cursor = "grab"; },
    onPointerOut: () => { document.body.style.cursor = "auto"; },
  };
}
