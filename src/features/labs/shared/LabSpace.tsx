import { Component, createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { defineText } from "../../../i18n";
import "./LabSpace.css";

const text = defineText({ vi: { enter: "Vào phòng thực hành", exit: "← Quay về", unavailable: "Không thể tải giao diện thí nghiệm. Bài làm vẫn được giữ trong phiên này.", retry: "Thử tải lại" }, en: { enter: "Enter lab space", exit: "← Back", unavailable: "The experiment view could not load. Your work is retained in this session.", retry: "Retry view" } });

export const LabHeaderActionsContext = createContext<HTMLElement | null>(null);

export const LabSceneContext = createContext<HTMLElement | null | undefined>(undefined);

class LabViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="panel" role="alert"><p>{text().unavailable}</p><button type="button" className="secondary" onClick={() => this.setState({ failed: false })}>{text().retry}</button></div> : this.props.children; }
}

export function LabSpace({ title, exitTo, onExit, children, active = true }: { active?: boolean; title: string; exitTo?: string; onExit?: () => void; children: ReactNode }) {
  const exit = useRef<HTMLButtonElement>(null);
  const [headerActions, setHeaderActions] = useState<HTMLDivElement | null>(null);
  const [sceneRoot, setSceneRoot] = useState<HTMLDivElement | null>(null);
  const t = text();
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const siblings = [...document.body.children].filter((node) => !node.classList.contains("lab-space")) as HTMLElement[];
    const inert = siblings.map((node) => node.inert);
    siblings.forEach((node) => { node.inert = true; });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".lab-space-header a, .lab-space-header button")?.focus({ preventScroll: true }));
    return () => {
      siblings.forEach((node, index) => { node.inert = inert[index]; });
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [active]);
  return createPortal(<section hidden={!active} className="lab-space" aria-label={title} data-testid="lab-space">
    <header className="lab-space-header">{exitTo ? <Link className="secondary" to={exitTo}>{t.exit}</Link> : <button ref={exit} type="button" className="secondary" onClick={onExit}>{t.exit}</button>}<h1>{title}</h1><div className="lab-space-header-actions" ref={setHeaderActions} /></header>
    <div className="lab-space-scene" ref={setSceneRoot} />
    <LabHeaderActionsContext.Provider value={headerActions}><LabSceneContext.Provider value={sceneRoot}><div className="lab-space-body"><LabViewBoundary>{children}</LabViewBoundary></div></LabSceneContext.Provider></LabHeaderActionsContext.Provider>
  </section>, document.body);
}

// Keep the lesson step mounted: entry changes presentation, never its attempt identity.
export function AssignedLabSpace({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  return <>
    <div className="lab-enter-wrapper">
      <button type="button" className="primary" data-testid="lab-space-enter" onClick={() => { setEntered(true); setOpen(true); }}>{text().enter}</button>
    </div>
    {entered && <LabSpace active={open} title={title} onExit={() => setOpen(false)}>{children}</LabSpace>}
  </>;
}
