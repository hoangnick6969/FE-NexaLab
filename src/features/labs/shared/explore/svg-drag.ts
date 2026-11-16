/**
 * Pointer drag on an SVG element for the Explore benches (direct manipulation). The handler gets the pointer position
 * in the user space of `frame` (or of the element the drag started on), so callers map it straight to model units.
 * Pointer capture keeps the drag alive outside the element; the 3D orbit camera never sees these DOM events.
 */
import type { PointerEvent as ReactPointerEvent } from "react";

export function svgLocalPoint(element: SVGGraphicsElement, clientX: number, clientY: number) {
  const matrix = element.getScreenCTM();
  return matrix ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()) : null;
}

export function svgDrag(onMove: (point: DOMPoint) => void, frame?: () => SVGGraphicsElement | null) {
  const at = (event: ReactPointerEvent<SVGElement>) => {
    const element = frame?.() ?? (event.currentTarget as unknown as SVGGraphicsElement);
    const point = svgLocalPoint(element, event.clientX, event.clientY);
    if (point) onMove(point);
  };
  return {
    onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      at(event);
    },
    onPointerMove: (event: ReactPointerEvent<SVGElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) at(event); },
    onPointerUp: (event: ReactPointerEvent<SVGElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); },
  };
}

/** Keyboard nudge for a draggable SVG handle: arrows step, PageUp/PageDown step ×10. */
export function nudgeKey(event: { key: string; preventDefault: () => void }, value: number, step: number, min: number, max: number, set: (value: number) => void) {
  const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? step : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -step
    : event.key === "PageUp" ? step * 10 : event.key === "PageDown" ? -step * 10 : 0;
  if (!delta) return;
  event.preventDefault();
  set(Math.min(max, Math.max(min, value + delta)));
}
