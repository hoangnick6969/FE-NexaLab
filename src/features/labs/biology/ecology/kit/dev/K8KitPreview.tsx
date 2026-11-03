import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LabSpace } from "../../../../shared/LabSpace";
import "../../tolerance/EcologyToleranceActivity.css";
import { tolerance } from "../../tolerance/eco-evidence";
import { EcoStage, FishSchool3D, PondDiorama3D, POND, Thermometer3D, type EcoView, type FishMood } from "..";

const VIEW: EcoView = { target: [0, -0.5, 0], direction: [0, 0.38, 1], width: 18.6, height: 7 };
const MOODS: Array<[FishMood | "auto", string]> = [
  ["auto", "Theo nhiệt độ"], ["neutral", "Chờ dự đoán"], ["swimming", "Bơi"], ["heat", "Quá nóng"], ["cold", "Quá lạnh"],
];
const PRESETS: Array<[number, string]> = [[20, "Quá lạnh"], [300, "Thích hợp"], [440, "Quá nóng"]];
const MAX = 500;
const celsius = (deci: number) => (deci / 10).toFixed(1).replace(".", ",");

/** Development-only K8 pond diorama: try temperatures the way the Lab does, or force one fish state; not a Lab run. */
export default function K8KitPreview() {
  const navigate = useNavigate();
  const [value, setValue] = useState(300);
  // "auto" follows the tilapia model like the Lab does; the other moods are manual overrides until the temperature changes.
  const [mood, setMood] = useState<FishMood | "auto">("auto");
  const [manualVigor, setVigor] = useState(1);
  const observation = tolerance(value);
  const limits = observation?.limits ?? { minDeciC: 56, maxDeciC: 420 };
  const span = Math.min(1, Math.max(0, (value - limits.minDeciC) / (limits.maxDeciC - limits.minDeciC)));
  const fishMood: FishMood = mood !== "auto" ? mood : observation?.canPersist ? "swimming" : value >= 240 ? "heat" : "cold";
  const vigor = mood !== "auto" ? manualVigor : observation?.canPersist ? Math.pow(Math.sin(Math.PI * span), 0.7) : 0;
  const status = observation?.canPersist ? "Cá rô phi tồn tại được: cá bơi, nhanh nhất ở khoảng giữa giới hạn."
    : value >= 240 ? "Quá nóng: cá ngoi lên đớp khí, rồi lịm dần và nằm dưới đáy."
    : "Quá lạnh: cá chậm dần, bạc màu và nằm dưới đáy.";
  const pct = (deci: number) => `${(deci / MAX) * 100}%`;
  return <LabSpace title="Bộ kit sinh thái K8, xem trước" onExit={() => navigate("/")}>
    <div className="eco-activity">
      <div className="eco-stage" data-view="3d" data-scene="pond">
        <div className="eco-pond eco-pond-3d">
          <EcoStage view={VIEW} avoid={[".lab-space-header", ".k8-panel"]}
            fallback={<p>WebGL unavailable</p>}
            scene={({ animate, dark }) => <>
              <PondDiorama3D valueDeciC={value} animate={animate} dark={dark} />
              <FishSchool3D mood={fishMood} vigor={vigor} animate={animate} />
              <Thermometer3D valueDeciC={value} label={`${celsius(value)} °C`} animate={animate} position={[POND.water.x - 0.7, POND.floor + 0.9, 1.2]} />
            </>} />
        </div>
      </div>
      <section className="k8-panel" aria-labelledby="k8-panel-title">
        <h2 id="k8-panel-title" className="k8-panel-title">Thử nhiệt độ nước ao</h2>
        <p className="k8-panel-status" data-out={mood === "auto" && !observation?.canPersist} aria-live="polite">
          {mood === "auto" ? status : "Đang ép trạng thái cá. Kéo thanh nhiệt độ hoặc bấm một nút đặt nhanh để cá lại phản ứng theo nhiệt độ."}
        </p>
        <label className="k8-temp">
          <span className="k8-temp-value">Nhiệt độ: <strong>{celsius(value)} °C</strong></span>
          <input type="range" min={0} max={MAX} value={value} onChange={(event) => { setValue(Number(event.target.value)); setMood("auto"); }} />
          <span className="k8-ruler" aria-hidden="true">
            <span className="k8-ruler-band" style={{ left: pct(limits.minDeciC), width: pct(limits.maxDeciC - limits.minDeciC) }} />
            <span className="k8-ruler-tick" data-limit style={{ left: pct(limits.minDeciC) }}>{celsius(limits.minDeciC)}</span>
            <span className="k8-ruler-tick" data-limit style={{ left: pct(limits.maxDeciC) }}>{celsius(limits.maxDeciC)}</span>
          </span>
          <span className="k8-ruler-legend">Thang 0–50 °C. Dải tô màu là giới hạn sinh thái của cá rô phi.</span>
        </label>
        <div className="k8-presets" role="group" aria-label="Đặt nhanh nhiệt độ">
          {PRESETS.map(([deci, label]) => <button key={deci} type="button" className="eco-tool k8-preset" aria-pressed={mood === "auto" && value === deci} onClick={() => { setValue(deci); setMood("auto"); }}>
            <span>{label}</span><span className="k8-preset-temp">{celsius(deci)} °C</span>
          </button>)}
        </div>
        <details className="k8-advanced">
          <summary>Nâng cao: ép trạng thái cá</summary>
          <div className="k8-advanced-body">
          <p className="eco-note">Ép cá vào một trạng thái để xem riêng hiệu ứng. Kéo nhiệt độ sẽ trả cá về chế độ theo nhiệt độ. Học sinh không thấy phần này.</p>
          <div className="k8-preview-moods" role="group" aria-label="Trạng thái cá">
            {MOODS.map(([item, label]) => <button key={item} type="button" className="eco-tool" aria-pressed={mood === item} onClick={() => setMood(item)}>{label}</button>)}
          </div>
          {mood === "swimming" && <label className="k8-temp">
            <span>Độ hăng khi bơi: {Math.round(manualVigor * 100)} %</span>
            <input type="range" min={0} max={1} step={0.05} value={manualVigor} onChange={(event) => setVigor(Number(event.target.value))} />
          </label>}
          </div>
        </details>
      </section>
    </div>
  </LabSpace>;
}
