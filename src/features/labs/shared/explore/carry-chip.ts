/**
 * "Held object" of an Explore bench (direct manipulation): while `label` is set, a chip follows the pointer; Esc or a
 * right-click puts the object down (the backlog rule for held items). The bench drops it on its own targets.
 */
import { useEffect, useRef } from "react";

export function useCarryChip(label: string | null, onDrop: () => void, className = "explore-carry-chip", data?: Record<string, string>) {
  const drop = useRef(onDrop);
  drop.current = onDrop;
  const dataKey = JSON.stringify(data ?? {});
  useEffect(() => {
    if (!label) return;
    const chip = document.createElement("span");
    chip.className = className;
    chip.textContent = label;
    chip.setAttribute("aria-hidden", "true");
    Object.entries(JSON.parse(dataKey) as Record<string, string>).forEach(([key, value]) => { chip.dataset[key] = value; });
    chip.style.visibility = "hidden";
    document.body.appendChild(chip);
    const move = (event: PointerEvent) => { chip.style.visibility = "visible"; chip.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`; };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") drop.current(); };
    const context = (event: MouseEvent) => { event.preventDefault(); drop.current(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("keydown", key);
    window.addEventListener("contextmenu", context);
    return () => { chip.remove(); window.removeEventListener("pointermove", move); window.removeEventListener("keydown", key); window.removeEventListener("contextmenu", context); };
  }, [label, className, dataKey]);
}
