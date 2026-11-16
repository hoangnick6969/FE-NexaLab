import { Beaker, Box, FlaskConical, Glasses, Hand, Lamp, Scissors, Shirt, TestTube2, type LucideIcon } from "lucide-react";
import type { KitItem } from "../../runtime/explore-registry";
import "./safety-scenario.css";

const icons: Record<string, LucideIcon> = {
  safety_goggles: Glasses, protective_gloves: Hand, lab_coat: Shirt,
  beaker_100ml: Beaker, test_tube: TestTube2, test_tube_holder: Scissors, alcohol_lamp: Lamp,
};

export function SafetyBenchArt({ items }: { items: readonly KitItem[] }) {
  return <ul className="safety-art" data-testid="safety-scene-2d">
    {items.map((item) => {
      const Icon = item.category === "material" ? FlaskConical : icons[item.rendererKey ?? ""] ?? Box;
      return <li key={item.id}><Icon aria-hidden="true" /><span>{item.labelVi}</span></li>;
    })}
  </ul>;
}
