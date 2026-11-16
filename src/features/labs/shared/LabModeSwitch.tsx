/**
 * Mode switch of a Lab that has both a Guided and an Explore mode (interim D-5, see `lab-modes.ts`). The library route
 * provides the pair; `LabSpace` draws the switch next to the title, so Guided and Explore benches both show it without
 * each page knowing about the other mode. Assignment and class routes provide nothing and keep their single mode.
 */
import { createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { Compass, ListChecks } from "lucide-react";
import "./LabModeSwitch.css";

/** Where each mode opens: two Lab IDs for the interim pairs, or one Lab ID with `?mode=` for a D-5 two-mode Lab. */
export type LabModeValue = { guidedHref: string; exploreHref: string; current: "guided" | "explore" };
export const LabModeContext = createContext<LabModeValue | null>(null);

export function LabModeSwitch() {
  const mode = useContext(LabModeContext);
  if (!mode) return null;
  return <nav className="lab-mode-switch" aria-label="Chế độ của bài thực hành" data-testid="lab-mode-switch">
    <Link to={mode.guidedHref} aria-current={mode.current === "guided" ? "page" : undefined} replace>
      <ListChecks size={15} aria-hidden="true" /><span>Có hướng dẫn</span>
    </Link>
    <Link to={mode.exploreHref} aria-current={mode.current === "explore" ? "page" : undefined} replace>
      <Compass size={15} aria-hidden="true" /><span>Khám phá tự do</span>
    </Link>
  </nav>;
}
