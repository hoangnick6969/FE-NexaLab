import { useEffect, useRef, useState, type Dispatch } from "react";
import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import type { BenchAction } from "./bench-reducer";
import { exportObservationLog, type ObservationLogEntry } from "./observation-log";

const time = (at: number) => new Date(at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function ObservationLogPanel({ config, entries, dispatch }: { config: ChemistryLabConfig; entries: readonly ObservationLogEntry[]; dispatch: Dispatch<BenchAction> }) {
  const [open, setOpen] = useState(() => typeof window === "undefined" || !window.matchMedia?.("(max-width: 720px)").matches);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [entries.length]);
  const download = () => {
    const blob = new Blob([JSON.stringify(exportObservationLog(config, entries), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nhat-ky-${config.catalogId.toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <section className={`k2-log${open ? "" : " is-collapsed"}`} aria-label="Nhật ký quan sát">
    <header>
      <h2>Nhật ký quan sát <small>{entries.length}</small></h2>
      <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Thu gọn" : "Mở"}</button>
    </header>
    {open && <>
      <p className="k2-small">Tự ghi mỗi thao tác. Lưu trên máy này, không chấm điểm.</p>
      {entries.length === 0 ? <p className="k2-log-empty">Chưa có quan sát nào. Hãy lấy một lọ hoá chất và nhỏ vào ống nghiệm.</p>
        : <ol ref={list} className="k2-log-list">{entries.map((entry) => <li key={`${entry.seq}-${entry.at}`} className={entry.outOfScope ? "is-scope" : ""}>
          <div className="k2-log-meta"><time>{time(entry.at)}</time><b>{entry.locationVi}</b></div>
          <p className="k2-log-action">{entry.actionVi}</p>
          <p className="k2-log-phenomena">{entry.phenomenaVi.join(" · ")}</p>
          {(entry.readings.ph || entry.readings.litmus || entry.readings.scale) && <p className="k2-log-readings k2-mono">
            {entry.readings.ph && <span>pH = {entry.readings.ph}</span>}
            {entry.readings.litmus && <span>Quỳ: {entry.readings.litmus}</span>}
            {entry.readings.scale && <span>Cân: {entry.readings.scale}</span>}
          </p>}
          {entry.equations.length > 0 && <p className="k2-log-eq">{entry.equations.join("; ")}</p>}
        </li>)}</ol>}
      <div className="k2-row">
        <button type="button" className="secondary" disabled={!entries.length} onClick={download}>Xuất nhật ký (JSON)</button>
        <button type="button" className="text-button" disabled={!entries.length} onClick={() => { if (window.confirm("Xoá toàn bộ nhật ký quan sát trên máy này?")) dispatch({ type: "clear_log" }); }}>Xoá nhật ký</button>
      </div>
    </>}
  </section>;
}
