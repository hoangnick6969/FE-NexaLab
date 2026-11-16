/**
 * Stage 1 of the Explore-first flow, shared by every kit: outcomes, apparatus, materials,
 * safety split into "in the simulation" and "in a real lab", and model limits.
 */
import { useEffect, useRef, useState } from "react";
import "./LabIntro.css";

export type IntroMaterial = { id: string; label: string; hazardLevel: "none" | "caution" | "warning" | "danger"; hazardTags: readonly string[]; noteSim?: string; noteReal?: string };
export type IntroApparatus = { id: string; label: string; purpose: string };

export const HAZARD_TAG_VI: Record<string, string> = { corrosive: "Ăn mòn (GHS05)", irritant: "Gây kích ứng", toxic_if_swallowed: "Độc khi nuốt", flammable: "Dễ cháy", aquatic_long_lasting: "Có hại lâu dài đối với sinh vật thủy sinh", corrosive_to_metals: "Có thể ăn mòn kim loại" };
export const HAZARD_LEVEL_VI = { none: "", caution: "Cẩn thận", warning: "Nguy hiểm", danger: "Rất nguy hiểm" } as const;

export function LabIntroOverlay({ title, contextLabel, outcomes, apparatus, materials, safety, limitations, acknowledgeRequired, acknowledged, onEnter, onClose, draftNotice }: {
  title: string;
  contextLabel?: string;
  outcomes: readonly string[];
  apparatus: readonly IntroApparatus[];
  materials: readonly IntroMaterial[];
  safety: { simulation: readonly string[]; realLab: readonly string[] };
  limitations: readonly string[];
  acknowledgeRequired: boolean;
  /** True when the learner already confirmed the safety notes for this Lab version. */
  acknowledged: boolean;
  onEnter: () => void;
  /** Present when the overlay was reopened from the bench. */
  onClose?: () => void;
  draftNotice?: string;
}) {
  const [checked, setChecked] = useState(acknowledged);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { dialog.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!onClose) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const canEnter = !acknowledgeRequired || checked;
  return <div className="lab-intro-backdrop">
    <div className="lab-intro" role="dialog" aria-modal="true" aria-labelledby="lab-intro-title" ref={dialog}>
      <header className="lab-intro-head">
        {contextLabel && <span className="lab-intro-context">{contextLabel}</span>}
        <h2 id="lab-intro-title" tabIndex={-1}>{title}</h2>
        {draftNotice && <p className="lab-intro-draft">{draftNotice}</p>}
      </header>
      <div className="lab-intro-body">
        <section>
          <h3>Em sẽ tìm hiểu</h3>
          <ul className="lab-intro-outcomes">{outcomes.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="lab-intro-safety" aria-label="Lưu ý an toàn">
          <h3>Lưu ý an toàn</h3>
          <div className="lab-intro-columns">
            <div className="lab-intro-sim"><h4>Trong mô phỏng 3D</h4><ul>{safety.simulation.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="lab-intro-real"><h4>Trong phòng thí nghiệm thật</h4><ul>{safety.realLab.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          <p className="lab-intro-small">Lab ảo không thay thế hướng dẫn của giáo viên khi làm thí nghiệm thật.</p>
        </section>
        <section>
          <h3>Hoá chất trên kệ</h3>
          <ul className="lab-intro-materials">{materials.map((item) => <li key={item.id}>
            <span>{item.label}</span>
            {item.hazardLevel !== "none" && <span className={`lab-intro-hazard is-${item.hazardLevel}`}>{[HAZARD_LEVEL_VI[item.hazardLevel], ...item.hazardTags.map((tag) => HAZARD_TAG_VI[tag] ?? tag)].filter(Boolean).join(" · ")}</span>}
            {item.noteReal && <small>Khi làm thật: {item.noteReal}</small>}
          </li>)}</ul>
        </section>
        <section>
          <h3>Dụng cụ trên bàn</h3>
          <ul className="lab-intro-apparatus">{apparatus.map((item) => <li key={item.id}><b>{item.label}</b><span>{item.purpose}</span></li>)}</ul>
          <p className="lab-intro-small">Trên bàn, di chuột hoặc chạm vào từng món để xem tên và công dụng.</p>
        </section>
        {limitations.length > 0 && <section>
          <h3>Giới hạn của mô hình</h3>
          <ul className="lab-intro-limits">{limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>}
      </div>
      <footer className="lab-intro-foot">
        {acknowledgeRequired && <label className="lab-intro-ack"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> Em đã đọc lưu ý an toàn</label>}
        <div className="lab-intro-actions">
          {onClose && <button type="button" className="secondary" onClick={onClose}>Đóng</button>}
          <button type="button" className="primary" disabled={!canEnter} onClick={onEnter}>{onClose ? "Quay lại bàn thí nghiệm" : "Vào bàn thí nghiệm"}</button>
        </div>
      </footer>
    </div>
  </div>;
}
