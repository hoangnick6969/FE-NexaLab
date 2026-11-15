/**
 * Sections the Lab Space adds to an activity's question panel: the run result (verdict, explanation, hints) and the
 * teacher's Class Lab content. An activity with the shared question panel claims them and shows them as its last
 * sections, so the panel on the right is the one place for questions, results and teacher prompts. Without a claim
 * the Lab Space keeps its own places: the result drawer on the right and the teacher drawer on the left. Neither sits
 * in the scene flow, so they cannot push or cover the activity's panels, dock or modals.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { defineText } from "../../../i18n";

const text = defineText({
  vi: { open: "Hướng dẫn của giáo viên", close: "Thu gọn hướng dẫn của giáo viên", collapse: "Thu gọn" },
  en: { open: "Teacher instructions", close: "Collapse teacher instructions", collapse: "Collapse" },
});

type Sections = { classSection: ReactNode; result: ReactNode };
type Slot = Sections & { claim: () => () => void };
const LabPanelSectionsContext = createContext<Slot | null>(null);

/** The result and teacher sections for the activity's panel; claiming them tells the Lab Space not to draw its own. */
export function useLabPanelSections(): Sections {
  const slot = useContext(LabPanelSectionsContext);
  const claim = slot?.claim;
  useEffect(() => claim?.(), [claim]);
  return { classSection: slot?.classSection ?? null, result: slot?.result ?? null };
}

/** `headerActions` is the Lab Space header slot: the teacher drawer's reopen button lives there, clear of the scene. */
export function LabClassSectionProvider({ section, result, headerActions, children }: { section?: ReactNode; result?: ReactNode; headerActions: HTMLElement | null; children: ReactNode }) {
  const [claims, setClaims] = useState(0);
  const claim = useCallback(() => { setClaims((count) => count + 1); return () => setClaims((count) => count - 1); }, []);
  const slot = useMemo(() => section || result ? { classSection: section ?? null, result: result ?? null, claim } : null, [section, result, claim]);
  return <LabPanelSectionsContext.Provider value={slot}>
    {children}
    {claims === 0 && result && <aside className="lab-aside">{result}</aside>}
    {claims === 0 && section && <LabClassDrawer headerActions={headerActions}>{section}</LabClassDrawer>}
  </LabPanelSectionsContext.Provider>;
}

function LabClassDrawer({ headerActions, children }: { headerActions: HTMLElement | null; children: ReactNode }) {
  const t = text();
  const [open, setOpen] = useState(true);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true })); };
  return <>
    {headerActions && createPortal(<button ref={toggle} type="button" className="secondary lab-class-toggle" aria-expanded={open} aria-controls="lab-class-drawer" hidden={open} onClick={() => setOpen(true)}>{t.open}</button>, headerActions)}
    <aside id="lab-class-drawer" className="lab-class-drawer" aria-label={t.open} hidden={!open}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <button type="button" className="text-button lab-class-collapse" aria-label={t.close} onClick={close}>{t.collapse}</button>
      {children}
    </aside>
  </>;
}
