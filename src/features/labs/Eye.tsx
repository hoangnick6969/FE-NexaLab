import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { HandControl } from "./HandControl";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    separate: "Tách rời",
    separateLabel: "Tách rời",
    hideSclera: "Ẩn củng mạc",
    crossSection: "Cắt tiết diện",
    explore: "Khám phá",
    checkNames: "Kiểm tra tên gọi",
    part: (n: number) => `Bộ phận ${n}`,
    quizHint: "Nhìn mô hình và nhập tên của bộ phận đang được chọn.",
    partName: (n: number) => `Tên bộ phận #${n}`,
    placeholder: "Nhập tên bộ phận bằng tiếng Việt",
    disclaimer: "Mô hình hình học minh họa, không phải mô hình giải phẫu chuẩn y khoa. Kéo để xoay, cuộn để phóng to, chuột phải để di chuyển.",
  },
  en: {
    separate: "Separate",
    separateLabel: "Separate",
    hideSclera: "Hide the sclera",
    crossSection: "Cross-section",
    explore: "Explore",
    checkNames: "Check the names",
    part: (n: number) => `Part ${n}`,
    quizHint: "Look at the model and type the name of the selected part.",
    partName: (n: number) => `Name of part #${n}`,
    placeholder: "Type the part name in Vietnamese",
    disclaimer: "An illustrative geometric model, not a medical-grade anatomy model. Drag to rotate, scroll to zoom, right-click to move.",
  },
});
const t = text();
const parts = [
  {
    id: "cornea",
    name: "Giác mạc",
    desc: "Lớp trong suốt phía trước giúp khúc xạ ánh sáng.",
    color: "#b2dae5",
    size: [0.85, 0.85, 0.24],
    z: 1.25,
  },
  {
    id: "aqueous",
    name: "Thủy dịch",
    desc: "Dịch trong suốt nằm giữa giác mạc và thể thủy tinh.",
    color: "#a1d3dc",
    size: [0.75, 0.75, 0.16],
    z: 1.03,
  },
  {
    id: "pupil",
    name: "Đồng tử",
    desc: "Lỗ ở giữa mống mắt, cho ánh sáng đi qua.",
    color: "#243e41",
    size: [0.34, 0.34, 0.09],
    z: 0.85,
  },
  {
    id: "lens",
    name: "Thể thủy tinh",
    desc: "Điều tiết để hội tụ ánh sáng lên võng mạc.",
    color: "#dbd8a1",
    size: [0.6, 0.6, 0.26],
    z: 0.63,
  },
  {
    id: "vitreous",
    name: "Dịch kính",
    desc: "Khối gel trong suốt duy trì hình dạng nhãn cầu.",
    color: "#b3ccdf",
    size: [0.95, 0.95, 0.85],
    z: -0.15,
  },
  {
    id: "retina",
    name: "Võng mạc",
    desc: "Tiếp nhận ánh sáng và chuyển thành tín hiệu thần kinh.",
    color: "#d78670",
    size: [1.05, 1.05, 0.16],
    z: -1.05,
  },
  {
    id: "nerve",
    name: "Dây thần kinh thị giác",
    desc: "Dẫn truyền tín hiệu từ võng mạc đến não.",
    color: "#e3c584",
    size: [0.26, 0.26, 0.65],
    z: -1.7,
  },
  {
    id: "sclera",
    name: "Củng mạc",
    desc: "Vỏ ngoài bảo vệ và giữ hình dạng mắt.",
    color: "#e6e4dc",
    size: [1.2, 1.2, 1.2],
    z: 0,
  },
];
export default function Eye({
  state,
  onChange,
}: {
  state: any;
  onChange: (s: any) => void;
}) {
  const [rotation, setRotation] = useState(-0.45);
  const [explode, setExplode] = useState(0.7);
  const [selected, setSelected] = useState("cornea");
  const [hide, setHide] = useState(true);
  const [clip, setClip] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const p = parts.find((p) => p.id === selected)!;
  const planes = useMemo(
    () => [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)],
    [],
  );
  return (
    <div className="eye-lab">
      <div className="eye-tools">
        <label>
          {t.separate}{" "}
          <input
            aria-label={t.separateLabel}
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={hide}
            onChange={(e) => setHide(e.target.checked)}
          />
          {t.hideSclera}
        </label>
        <label>
          <input
            type="checkbox"
            checked={clip}
            onChange={(e) => setClip(e.target.checked)}
          />
          {t.crossSection}
        </label>
        <button
          className={quiz ? "primary" : "secondary"}
          onClick={() => setQuiz(!quiz)}
        >
          {quiz ? t.explore : t.checkNames}
        </button>
      </div>
      <HandControl
        onGesture={(g) => {
          setRotation(g.rotation);
          setExplode(g.explode);
          if (g.pinch)
            setSelected(
              (id) =>
                parts[(parts.findIndex((p) => p.id === id) + 1) % parts.length]
                  .id,
            );
        }}
      />
      <div className="eye-canvas">
        <Canvas
          camera={{ position: [5, 2, 7], fov: 40 }}
          gl={{ localClippingEnabled: true }}
        >
          <color attach="background" args={["#eef1ec"]} />
          <ambientLight intensity={1.6} />
          <directionalLight position={[5, 7, 6]} intensity={2} />
          <group rotation={[0, rotation, 0]}>
            {parts
              .filter((p) => !(hide && p.id === "sclera"))
              .map((p, i) => (
                <mesh
                  key={p.id}
                  position={[0, 0, p.z * (1 + explode)]}
                  scale={p.size as [number, number, number]}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(p.id);
                  }}
                >
                  <sphereGeometry args={[1, 40, 24]} />
                  <meshStandardMaterial
                    color={p.color}
                    roughness={0.35}
                    metalness={0.04}
                    transparent
                    opacity={
                      p.id === "sclera" ? 0.28 : p.id === "vitreous" ? 0.5 : 0.9
                    }
                    emissive={selected === p.id ? "#294d38" : "#000000"}
                    emissiveIntensity={selected === p.id ? 0.3 : 0}
                    clippingPlanes={clip ? planes : []}
                  />
                </mesh>
              ))}
          </group>
          <OrbitControls
            makeDefault
            enablePan
            minDistance={3}
            maxDistance={18}
          />
        </Canvas>
        <span className="model-watermark">NEXALAB / ANATOMY STUDY 01</span>
      </div>
      <div className="eye-description">
        <b>
          {quiz
            ? t.part(parts.findIndex((x) => x.id === p.id) + 1)
            : p.name}
        </b>
        <p>
          {quiz
            ? t.quizHint
            : p.desc}
        </p>
      </div>
      <div className="part-tabs">
        {parts.map((p, i) => (
          <button
            className={selected === p.id ? "selected" : ""}
            key={p.id}
            onClick={() => setSelected(p.id)}
          >
            {quiz ? "#" + (i + 1) : p.name}
          </button>
        ))}
      </div>
      {quiz && (
        <label className="field anatomy-answer">
          <span>{t.partName(parts.findIndex((x) => x.id === p.id) + 1)}</span>
          <input
            value={state.answers?.[selected] ?? ""}
            onChange={(e) =>
              onChange({
                ...state,
                answers: { ...state.answers, [selected]: e.target.value },
              })
            }
            placeholder={t.placeholder}
          />
        </label>
      )}
      <p className="tiny muted">
        {t.disclaimer}
      </p>
    </div>
  );
}
