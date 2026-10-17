import { useState } from "react";

const jars = [
  { id: "jar1", color: "red", colorName: "đỏ" },
  { id: "jar2", color: "purple", colorName: "tím" },
  { id: "jar3", color: "blue", colorName: "xanh" },
] as const;

export function Chemistry({
  state,
  onChange,
  result,
}: {
  state: any;
  onChange: (s: any) => void;
  result: any;
}) {
  const [dipped, setDipped] = useState<Record<string, boolean>>({});
  return (
    <div className="chemistry-lab">
      <div className="chem-controls">
        <p className="muted">Nhúng giấy quỳ tím vào từng lọ mất nhãn. Quan sát màu giấy rồi xác định tính chất của dung dịch.</p>
        <div className="litmus-grid">
          {jars.map((jar, index) => (
            <div className="litmus-jar" key={jar.id}>
              <strong>Lọ {index + 1} — mất nhãn</strong>
              <div className="litmus-vessel" aria-label={`Lọ ${index + 1}`}>
                <div className="litmus-liquid" />
                <div className={`litmus-strip ${dipped[jar.id] ? `litmus-strip--${jar.color}` : ""}`} aria-hidden="true" />
              </div>
              {!dipped[jar.id] ? (
                <button type="button" className="text-button" onClick={() => setDipped((current) => ({ ...current, [jar.id]: true }))}>
                  Nhúng giấy quỳ tím vào lọ {index + 1}
                </button>
              ) : (
                <>
                  <p role="status">Giấy quỳ chuyển màu {jar.colorName}.</p>
                  <label className="field">
                    <span>Lọ {index + 1} thuộc loại nào?</span>
                    <select value={state.samples?.[jar.id] ?? ""} onChange={(e) => onChange({ ...state, samples: { ...state.samples, [jar.id]: e.target.value } })}>
                      <option value="">Chọn đáp án</option>
                      <option value="acid">Axit</option>
                      <option value="neutral">Trung tính</option>
                      <option value="base">Bazơ</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {result && <p className="beaker-caption">{result.phenomenon}</p>}
      <p className="tiny muted">Mô phỏng giáo dục, không dùng thay cho phép đo thực tế.</p>
    </div>
  );
}
