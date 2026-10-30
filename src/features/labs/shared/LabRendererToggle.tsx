import { Box, PanelsTopLeft } from "lucide-react";
import { useState } from "react";
import { defineText } from "../../../i18n";

const text = defineText({ vi: { label: "Chế độ hiển thị mô phỏng", unavailable: "Bài thực hành này hiện chưa có mô hình 2D." }, en: { label: "Simulation view", unavailable: "A 2D model is not available for this lab yet." } });

export type LabRendererMode = "3d" | "2d";

function readMode(storageKey: string): LabRendererMode {
  try { return window.localStorage.getItem(storageKey) === "2d" ? "2d" : "3d"; }
  catch { return "3d"; }
}

export function useLabRendererMode(storageKey: string) {
  const [mode, setMode] = useState<LabRendererMode>(() => readMode(storageKey));
  const changeMode = (next: LabRendererMode) => {
    setMode(next);
    try { window.localStorage.setItem(storageKey, next); } catch { /* View preference is best effort. */ }
  };
  return [mode, changeMode] as const;
}

export function LabRendererToggle({ mode, onChange, twoDimensionalAvailable = true }: { mode: LabRendererMode; onChange: (mode: LabRendererMode) => void; twoDimensionalAvailable?: boolean }) {
  const t = text();
  return <div className="lab-renderer-toggle" role="group" aria-label={t.label} data-testid="lab-renderer-toggle">
    <button type="button" aria-pressed={mode === "3d"} onClick={() => onChange("3d")}><Box size={15} aria-hidden="true" /><span>3D</span></button>
    <button type="button" aria-pressed={mode === "2d"} disabled={!twoDimensionalAvailable} title={twoDimensionalAvailable ? "" : t.unavailable} aria-label={twoDimensionalAvailable ? "2D" : `2D. ${t.unavailable}`} onClick={() => onChange("2d")}><PanelsTopLeft size={15} aria-hidden="true" /><span>2D</span></button>
    {!twoDimensionalAvailable && <span className="lab-renderer-status" role="status">{t.unavailable}</span>}
  </div>;
}
