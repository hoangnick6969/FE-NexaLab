import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LabSpace } from "../../../../shared/LabSpace";
import { LabRendererToggle, useLabRendererMode } from "../../../../shared/LabRendererToggle";
import { fl03DensityConfig, fl03Stations } from "../../density/fl03-density.config";
import { Balance2D, Cylinder2D, DigitalBalance3D, FluidBench3D, GraduatedCylinder3D, K3Hud, K3Slot, Specimen3D, formatReading, k3Material, k3Specimen } from "..";

/**
 * Development-only bench for inspecting K3 apparatus with FL-03 sample data.
 * Values here are config presentation, not a Lab run and not graded.
 */
export default function K3KitPreview() {
  const navigate = useNavigate();
  const config = fl03DensityConfig;
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:k3-preview");
  const [stationId, setStationId] = useState<string>("explore");
  const station = fl03Stations.find((item) => item.id === stationId)!;
  const [specimenId, setSpecimenId] = useState<string>("iron-1v");
  const [onPan, setOnPan] = useState(false);
  const [waterMl, setWaterMl] = useState(50);
  const [dropped, setDropped] = useState(false);
  const specimen = k3Specimen(config, station.specimens.length && (station.specimens as readonly string[]).includes(specimenId) ? specimenId : station.specimens[0] ?? "iron-1v");
  const material = k3Material(config, specimen.materialId);
  const readingG = onPan ? specimen.massG : 0;
  const pebbleInCylinder = dropped && specimen.shape === "irregular";
  const cylinderMl = waterMl + (pebbleInCylinder && specimen.shape === "irregular" ? specimen.volumeMl : 0);
  const { balance, cylinder } = config.instruments;

  const selectStation = (id: string) => {
    setStationId(id);
    const first = fl03Stations.find((item) => item.id === id)?.specimens[0];
    if (first) setSpecimenId(first);
    setOnPan(false);
    setDropped(false);
  };

  return <LabSpace title="Bàn chất lỏng K3, xem trước" onExit={() => navigate("/")}>
    <LabRendererToggle mode={mode} onChange={setMode} />
    {mode === "3d" ? <FluidBench3D>
      <K3Slot at="balance">
        <DigitalBalance3D instrument={balance} readingG={readingG}>
          {onPan && <Specimen3D specimen={specimen} material={material} />}
        </DigitalBalance3D>
      </K3Slot>
      <K3Slot at="cylinder"><GraduatedCylinder3D cylinder={cylinder} volumeMl={cylinderMl} /></K3Slot>
      {!onPan && !pebbleInCylinder && <K3Slot at="tray"><Specimen3D specimen={specimen} material={material} /></K3Slot>}
    </FluidBench3D> : <div className="k3-preview-2d">
      <Balance2D instrument={balance} readingG={readingG} label="Cân điện tử" />
      <Cylinder2D cylinder={cylinder} volumeMl={cylinderMl} label={`Ống đong ${cylinderMl} mL`} />
      <Cylinder2D cylinder={cylinder} volumeMl={cylinderMl} label="Phóng to mặt khum" zoom />
    </div>}
    <K3Hud
      title="Xác định khối lượng riêng"
      stations={fl03Stations.map((item) => ({ id: item.id, label: { explore: "Khám phá", block: "Khối gỗ", water: "Nước", pebble: "Sỏi", conclusion: "Kết luận" }[item.id] }))}
      current={stationId}
      onSelect={selectStation}
      step={{ index: fl03Stations.findIndex((item) => item.id === stationId), total: fl03Stations.length }}
      instruction={`Mẫu ${material.label.vi.toLowerCase()} (${specimen.id}). Đặt mẫu lên cân, đọc số chỉ; với sỏi, đọc mực nước trước và sau khi thả.`}
      readout={<>Cân: {formatReading(readingG, balance.resolutionG)} g, ống đong: {cylinderMl} mL</>}
      notice={`Bản xem trước bộ kit, số liệu ${config.reviewStatus === "REVIEWED" ? "đã duyệt" : "đề xuất, chưa duyệt"}; không chấm điểm.`}
      actions={<>
        {station.specimens.length > 0 && <select aria-label="Mẫu vật" value={specimen.id} onChange={(event) => { setSpecimenId(event.target.value); setOnPan(false); setDropped(false); }}>
          {station.specimens.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>}
        <button type="button" className="secondary" onClick={() => setOnPan(!onPan)} disabled={!station.specimens.length || pebbleInCylinder}>{onPan ? "Lấy khỏi cân" : "Đặt lên cân"}</button>
        {specimen.shape === "irregular" && <button type="button" className="secondary" onClick={() => { setOnPan(false); setDropped(!dropped); }}>{dropped ? "Lấy sỏi ra" : "Thả sỏi vào ống đong"}</button>}
        <label className="k3-range">Nước ban đầu {waterMl} mL
          <input type="range" min={0} max={80} step={1} value={waterMl} onChange={(event) => setWaterMl(Number(event.target.value))} />
        </label>
      </>}
    />
  </LabSpace>;
}
