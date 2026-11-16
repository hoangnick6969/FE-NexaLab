/**
 * FL-21 Explore, chain station: press on one species label of the board (2D board or the 3D meadow's label overlay)
 * and drag to another to draw the feeding arrow "A → B" (food → eater). A rubber-band arrow follows the pointer;
 * releasing on another `.fw-node` calls `onLink`. A plain click still goes to the node's own handler (append to the
 * chain), because a drag that ends on another element never produces a click on the first one.
 */
import { useEffect, useRef } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";
const START_DRAG_PX = 6;

export function useLinkDrag(enabled: boolean, onLink: (from: string, to: string) => void, scope = ".explore-scene") {
  const latest = useRef(onLink);
  latest.current = onLink;
  useEffect(() => {
    if (!enabled) return;
    let from: { id: string; x: number; y: number } | null = null;
    let overlay: SVGSVGElement | null = null;
    let line: SVGLineElement | null = null;
    let target: HTMLElement | null = null;
    const nodeAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>(`${scope} .fw-node`) ?? null;
    const mark = (next: HTMLElement | null) => {
      if (target === next) return;
      target?.removeAttribute("data-link-target");
      target = next && next.dataset.species !== from?.id ? next : null;
      target?.setAttribute("data-link-target", "true");
    };
    const clear = () => { overlay?.remove(); overlay = null; line = null; mark(null); from = null; document.body.classList.remove("fw-linking"); };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const node = (event.target as Element | null)?.closest?.<HTMLElement>(`${scope} .fw-node`);
      if (!node?.dataset.species) return;
      const box = node.getBoundingClientRect();
      from = { id: node.dataset.species, x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };
    const move = (event: PointerEvent) => {
      if (!from) return;
      if (!overlay) {
        if (Math.hypot(event.clientX - from.x, event.clientY - from.y) < START_DRAG_PX * 4) return;
        overlay = document.createElementNS(SVG_NS, "svg");
        overlay.setAttribute("class", "fw-link-drag");
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = '<defs><marker id="fw-link-drag-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" /></marker></defs>';
        line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", String(from.x));
        line.setAttribute("y1", String(from.y));
        line.setAttribute("marker-end", "url(#fw-link-drag-head)");
        overlay.appendChild(line);
        document.body.appendChild(overlay);
        document.body.classList.add("fw-linking");
      }
      event.preventDefault();
      line!.setAttribute("x2", String(event.clientX));
      line!.setAttribute("y2", String(event.clientY));
      mark(nodeAt(event.clientX, event.clientY));
    };
    const up = (event: PointerEvent) => {
      if (!from) return;
      const dragged = overlay !== null;
      const start = from.id;
      const end = dragged ? nodeAt(event.clientX, event.clientY)?.dataset.species : undefined;
      clear();
      if (end && end !== start) latest.current(start, end);
    };
    const cancel = () => clear();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") clear(); };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("keydown", escape);
    return () => {
      clear();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("keydown", escape);
    };
  }, [enabled, scope]);
}
