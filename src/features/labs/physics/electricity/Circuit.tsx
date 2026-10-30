import { simulate } from "@nexalab/sim";
import { useMemo, useState } from "react";
import { defineText } from "../../../../i18n";
import { PhysicsStage } from "../shared/PhysicsStage";
import { Wire } from "./CircuitBulb3DStage";
import { Circuit2DEditor } from "./Circuit2DEditor";
import { LabRendererToggle, useLabRendererMode } from "../../shared/LabRendererToggle";

const text = defineText({
  vi: {
    battery: "Nguồn điện",
    resistor: "Điện trở",
    led: "LED đỏ",
    switchName: "Công tắc",
    closed: "Đóng",
    open: "Mở",
    drop: "Sụt áp 2 V",
    instructions: "Chọn linh kiện trên bàn hoặc trong danh sách để chỉnh. Chọn hai đầu dây để nối; có thể nối bất kỳ cặp linh kiện khác nhau.",
    value: "Giá trị",
    valueLabel: "Giá trị linh kiện",
    closeSwitch: "Đóng công tắc",
    removePart: "Xóa linh kiện",
    selectPart: "Chọn một linh kiện để chỉnh tham số.",
    parts: "Linh kiện", source: "Đầu dây nguồn", target: "Đầu dây đích", connect: "Nối dây", wires: "Dây nối", removeWire: "Xóa dây", controls: "Điều khiển mạch điện",
    autoWire: "Nối nhanh một vòng theo thứ tự linh kiện",
  },
  en: {
    battery: "Power source",
    resistor: "Resistor",
    led: "Red LED",
    switchName: "Switch",
    closed: "Closed",
    open: "Open",
    drop: "2 V drop",
    instructions: "Select a part on the bench or in the list to edit it. Choose two wire ends to connect any pair of different parts.",
    value: "Value",
    valueLabel: "Component value",
    closeSwitch: "Close the switch",
    removePart: "Remove part",
    selectPart: "Select a part to adjust it.",
    parts: "Parts", source: "Wire source", target: "Wire target", connect: "Connect wire", wires: "Connections", removeWire: "Remove wire", controls: "Circuit controls",
    autoWire: "Quick-wire a loop in part order",
  },
});
const t = text();
const icons: Record<string, string> = {
  battery: "▰",
  resistor: "⌁",
  led: "◉",
  switch: "⏻",
};
const labels: Record<string, string> = {
  battery: t.battery,
  resistor: t.resistor,
  led: t.led,
  switch: t.switchName,
};
export function defaultCircuit() {
  return {
    nodes: [
      { id: "b1", type: "battery", value: 9 },
      { id: "r1", type: "resistor", value: 330 },
      { id: "l1", type: "led" },
      { id: "s1", type: "switch", closed: true },
    ],
    edges: [],
  };
}

type Part = { id: string; type: string; value?: number; closed?: boolean };
type CircuitState = { nodes: Part[]; edges: { source: string; target: string }[] };
const position = (index: number): [number, number, number] => [(index % 4 - 1.5)*1.05, .22, Math.floor(index/4)*.7-.3];

function Apparatus({ part, index, selected, lit, onSelect }: { part: Part; index: number; selected: boolean; lit: boolean; onSelect: () => void }) {
  const color = selected ? "#e4ad42" : part.type === "battery" ? "#325c85" : part.type === "resistor" ? "#c8ad7e" : part.type === "led" ? "#a83232" : "#324d49";
  return <group position={position(index)} onClick={event => { event.stopPropagation(); onSelect(); }}>
    <mesh castShadow receiveShadow><boxGeometry args={[.7,.14,.4]} /><meshStandardMaterial color="#e6e6da" /></mesh>
    {part.type === "led" ? <mesh position={[0,.18,0]} castShadow><sphereGeometry args={[.14,24,16]} /><meshStandardMaterial color={lit ? "#ff523e" : color} emissive={lit ? "#ef3020" : "#000000"} emissiveIntensity={lit ? 1.2 : 0} roughness={.25} transparent opacity={.85} /></mesh> : part.type === "battery" ? <mesh position={[0,.22,0]} castShadow><boxGeometry args={[.42,.36,.26]} /><meshStandardMaterial color={color} roughness={.4} metalness={.2} /></mesh> : part.type === "switch" ? <mesh position={[0,.14,0]} rotation={[0,0,part.closed ? 0 : .55]} castShadow><boxGeometry args={[.5,.06,.08]} /><meshStandardMaterial color={color} metalness={.7} roughness={.3} /></mesh> : <mesh position={[0,.14,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.09,.09,.42,16]} /><meshStandardMaterial color={color} /></mesh>}
    {[-.3,.3].map(x => <mesh key={x} position={[x,.12,0]}><cylinderGeometry args={[.035,.035,.12,12]} /><meshStandardMaterial color="#b89442" metalness={.8} roughness={.3} /></mesh>)}
  </group>;
}

export function Circuit({ initial, onChange }: { initial: CircuitState; onChange: (state: CircuitState) => void }) {
  const [viewMode, setViewMode] = useLabRendererMode("nexalab:lab-view:circuit-builder");
  const [state, setState] = useState<CircuitState>(() => initial);
  const preview = useMemo(() => { try { return simulate("circuit", state) as any; } catch { return null; } }, [state]);
  const [selected, setSelected] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const current = state.nodes.find(part => part.id === selected);
  const emit = (next: CircuitState) => { setState(next); onChange(next); };
  const update = (data: Partial<Part>) => emit({ ...state, nodes: state.nodes.map(part => part.id === selected ? { ...part, ...data } : part) });
  const connect = () => {
    if (!source || !target || source === target || state.edges.some(edge => (edge.source === source && edge.target === target) || (edge.source === target && edge.target === source))) return;
    emit({ ...state, edges: [...state.edges, { source, target }] });
  };
  const add = (type: string) => {
    const part: Part = { id: crypto.randomUUID(), type, ...(type === "battery" ? { value: 9 } : type === "resistor" ? { value: 330 } : type === "switch" ? { closed: true } : {}) };
    emit({ ...state, nodes: [...state.nodes, part] }); setSelected(part.id);
  };
  if (viewMode === "2d") return <div className="circuit-editor circuit-editor-2d" data-testid="circuit-2d-stage">
    <LabRendererToggle mode={viewMode} onChange={setViewMode} />
    <Circuit2DEditor initial={state} onChange={emit} />
  </div>;
  return <div className="circuit-editor">
    <div className="circuit-renderer-stage">
      <LabRendererToggle mode={viewMode} onChange={setViewMode} />
      <PhysicsStage>
        {state.nodes.map((part, index) => <Apparatus key={part.id} part={part} index={index} lit={preview?.ledState === "ON"} selected={selected === part.id} onSelect={() => setSelected(part.id)} />)}
        {state.edges.map((edge, index) => {
          const a = state.nodes.findIndex(part => part.id === edge.source), b = state.nodes.findIndex(part => part.id === edge.target);
          return a < 0 || b < 0 ? null : <Wire key={`${edge.source}:${edge.target}:${index}`} start={position(a)} end={position(b)} sag={.05} color={index%2 ? "#303e48" : "#b94735"} />;
        })}
      </PhysicsStage>
    </div>
    <details className="circuit-controls" open><summary>{t.controls}</summary>
      <p className="tiny muted">{t.instructions}</p>
      <div className="component-tray">{Object.keys(icons).map(kind => <button type="button" key={kind} onClick={() => add(kind)}><span>{icons[kind]}</span>+ {labels[kind]}</button>)}</div>
      <label>{t.parts}<select aria-label={t.parts} value={selected ?? ""} onChange={event => setSelected(event.target.value)}><option value="">{t.selectPart}</option>{state.nodes.map((part,index) => <option key={part.id} value={part.id}>{index+1}. {labels[part.type]}</option>)}</select></label>
      <div className="component-properties">{current ? <>
        <b>{labels[current.type]}</b>
        {["battery", "resistor"].includes(current.type) && <label>{t.value}<input aria-label={t.valueLabel} type="number" min={current.type === "battery" ? 1 : 0} max={current.type === "battery" ? 24 : 100000} value={current.value ?? 0} onChange={event => update({ value: Number(event.target.value) })} />{current.type === "battery" ? "V" : "Ω"}</label>}
        {current.type === "switch" && <label className="check"><input type="checkbox" checked={!!current.closed} onChange={event => update({ closed: event.target.checked })} />{t.closeSwitch}</label>}
        <button type="button" className="danger-text" onClick={() => { emit({ nodes: state.nodes.filter(part => part.id !== selected), edges: state.edges.filter(edge => edge.source !== selected && edge.target !== selected) }); setSelected(null); }}>{t.removePart}</button>
      </> : <span>{t.selectPart}</span>}</div>
      <div className="circuit-wire-controls">{([{ label: t.source, value: source, set: setSource }, { label: t.target, value: target, set: setTarget }]).map(control => <label key={control.label}>{control.label}<select aria-label={control.label} value={control.value} onChange={event => control.set(event.target.value)}><option value="">—</option>{state.nodes.map((part,index) => <option key={part.id} value={part.id}>{index+1}. {labels[part.type]}</option>)}</select></label>)}
      <button type="button" className="secondary" disabled={!state.nodes.some(part => part.id === source) || !state.nodes.some(part => part.id === target) || source === target} onClick={connect}>{t.connect}</button></div>
      <ul aria-label={t.wires}>{state.edges.map((edge,index) => <li key={index}>{state.nodes.findIndex(part => part.id === edge.source)+1} → {state.nodes.findIndex(part => part.id === edge.target)+1}<button type="button" className="text-button" aria-label={`${t.removeWire} ${index+1}`} onClick={() => emit({ ...state, edges: state.edges.filter((_,i) => i !== index) })}>{t.removeWire}</button></li>)}</ul>
      <button type="button" className="text-button sample-button" disabled={state.nodes.length < 2} onClick={() => emit({ ...state, edges: state.nodes.map((part,index) => ({ source: part.id, target: state.nodes[(index+1)%state.nodes.length].id })) })}>{t.autoWire}</button>
    </details>
  </div>;
}
