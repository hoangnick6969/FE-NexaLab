const reactions = [
  ["mg-hcl", "Mg + HCl", "Mg", "HCl"],
  ["caco3-hcl", "CaCO₃ + HCl", "CaCO₃", "HCl"],
  ["naoh-hcl", "NaOH + HCl", "NaOH", "HCl"],
  ["cuso4-naoh", "CuSO₄ + NaOH", "CuSO₄", "NaOH"],
  ["nacl-agno3", "NaCl + AgNO₃", "NaCl", "AgNO₃"],
  ["fe-cuso4", "Fe + CuSO₄", "Fe", "CuSO₄"],
];
export function Chemistry({
  state,
  onChange,
  result,
}: {
  state: any;
  onChange: (s: any) => void;
  result: any;
}) {
  const selected =
    reactions.find((r) => r[0] === state.reactionId) ?? reactions[0];
  return (
    <div className="chemistry-lab">
      <div className="chem-controls">
        <label className="field">
          <span>Phản ứng trong thư viện</span>
          <select
            value={state.reactionId ?? "mg-hcl"}
            onChange={(e) => onChange({ ...state, reactionId: e.target.value })}
          >
            {reactions.map((r) => (
              <option key={r[0]} value={r[0]}>
                {r[1]}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Lượng {selected[2]} (mol)</span>
            <input
              type="number"
              min="0"
              max="2"
              step="0.01"
              value={state.molesA ?? 0.1}
              onChange={(e) =>
                onChange({ ...state, molesA: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>Lượng {selected[3]} (mol)</span>
            <input
              type="number"
              min="0"
              max="2"
              step="0.01"
              value={state.molesB ?? 0.2}
              onChange={(e) =>
                onChange({ ...state, molesB: Number(e.target.value) })
              }
            />
          </label>
        </div>
      </div>
      <div className="beaker-scene">
        <span className="beaker-label">
          {selected[2]} + {selected[3]}
        </span>
        <div className="beaker">
          <div className="beaker-marks">
            200 —<br />
            150 —<br />
            100 —<br />
            50 —
          </div>
          <div
            className={"liquid " + (result?.extent > 0 ? "reacted" : "")}
            style={{ background: result?.color ?? "#c4dce2" }}
          >
            {result?.extent > 0 &&
              [0, 1, 2, 3, 4, 5].map((i) => (
                <i
                  key={i}
                  style={{ left: 20 + i * 22, animationDelay: i * 0.3 + "s" }}
                />
              ))}
          </div>
        </div>
        <div className="bench" />
        <span className="beaker-caption">
          {result
            ? result.phenomenon
            : "Đặt lượng chất và chạy để quan sát mô phỏng"}
        </span>
      </div>
      <p className="tiny muted">
        Lượng chất nhập theo mol. Giả định phản ứng hoàn toàn, không mô phỏng
        nhiệt độ hay tốc độ. Chỉ minh họa trong môi trường ảo.
      </p>
    </div>
  );
}
