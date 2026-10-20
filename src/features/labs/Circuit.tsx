import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeProps,
  Node,
  Edge,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    battery: "Nguồn điện",
    resistor: "Điện trở",
    led: "LED đỏ",
    switchName: "Công tắc",
    closed: "Đóng",
    open: "Mở",
    drop: "Sụt áp 2 V",
    instructions: "Kéo linh kiện để sắp xếp. Kéo từ chấm phải sang chấm trái để nối dây thành vòng kín. Chọn dây và nhấn Delete để xóa.",
    value: "Giá trị",
    valueLabel: "Giá trị linh kiện",
    closeSwitch: "Đóng công tắc",
    removePart: "Xóa linh kiện",
    selectPart: "Chọn một linh kiện để chỉnh tham số.",
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
    instructions: "Drag parts to arrange them. Drag from a right dot to a left dot to wire a closed loop. Select a wire and press Delete to remove it.",
    value: "Value",
    valueLabel: "Component value",
    closeSwitch: "Close the switch",
    removePart: "Remove part",
    selectPart: "Select a part to adjust it.",
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
function ComponentNode({ data, selected }: NodeProps) {
  return (
    <div className={"component-node " + (selected ? "selected" : "")}>
      <Handle type="target" position={Position.Left} />
      <div className={"component-symbol " + data.kind}>
        {icons[data.kind as string]}
      </div>
      <b>{labels[data.kind as string]}</b>
      <small>
        {data.kind === "battery"
          ? data.value + " V"
          : data.kind === "resistor"
            ? data.value + " Ω"
            : data.kind === "switch"
              ? data.closed
                ? t.closed
                : t.open
              : t.drop}
      </small>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { component: ComponentNode };
export function Circuit({
  initial,
  onChange,
}: {
  initial: any;
  onChange: (s: any) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initial.nodes.map((n: any, i: number) => ({
      id: n.id,
      type: "component",
      position: { x: 70 + (i % 2) * 270, y: 50 + Math.floor(i / 2) * 200 },
      data: { kind: n.type, value: n.value, closed: n.closed },
    })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initial.edges.map((e: any, i: number) => ({
      ...e,
      id: "e" + i,
      style: { stroke: "#b97e34", strokeWidth: 3 },
    })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const current = nodes.find((n) => n.id === selected);
  const emit = (ns: Node[], es: Edge[]) =>
    onChange({
      nodes: ns.map((n) => ({
        id: n.id,
        type: n.data.kind,
        ...(n.data.value !== undefined ? { value: n.data.value } : {}),
        ...(n.data.closed !== undefined ? { closed: n.data.closed } : {}),
      })),
      edges: es.map((e) => ({ source: e.source, target: e.target })),
    });
  function connect(c: Connection) {
    if (
      c.source === c.target ||
      edges.some(
        (e) =>
          (e.source === c.source && e.target === c.target) ||
          (e.target === c.source && e.source === c.target),
      )
    )
      return;
    const next = addEdge(
      { ...c, style: { stroke: "#b97e34", strokeWidth: 3 } },
      edges,
    );
    setEdges(next);
    emit(nodes, next);
  }
  function add(kind: string) {
    const id = crypto.randomUUID();
    const n = {
      id,
      type: "component",
      position: { x: 100 + Math.random() * 200, y: 90 + Math.random() * 200 },
      data: {
        kind,
        ...(kind === "resistor"
          ? { value: 330 }
          : kind === "battery"
            ? { value: 9 }
            : kind === "switch"
              ? { closed: true }
              : {}),
      },
    };
    const next = [...nodes, n];
    setNodes(next);
    emit(next, edges);
    setSelected(id);
  }
  function update(data: any) {
    const ns = nodes.map((n) =>
      n.id === selected ? { ...n, data: { ...n.data, ...data } } : n,
    );
    setNodes(ns);
    emit(ns, edges);
  }
  function remove() {
    const ns = nodes.filter((n) => n.id !== selected),
      es = edges.filter((e) => e.source !== selected && e.target !== selected);
    setNodes(ns);
    setEdges(es);
    emit(ns, es);
    setSelected(null);
  }
  return (
    <>
      <div className="component-tray">
        {Object.keys(icons).map((k) => (
          <button key={k} onClick={() => add(k)}>
            <span>{icons[k]}</span>+ {labels[k]}
          </button>
        ))}
      </div>
      <div className="circuit-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => setSelected(n.id)}
          onPaneClick={() => setSelected(null)}
          onNodesDelete={(deleted) => {
            const ns = nodes.filter((n) => !deleted.some((d) => d.id === n.id));
            const es = edges.filter(
              (e) =>
                ns.some((n) => n.id === e.source) &&
                ns.some((n) => n.id === e.target),
            );
            emit(ns, es);
          }}
          onEdgesDelete={(deleted) =>
            emit(
              nodes,
              edges.filter((e) => !deleted.some((d) => d.id === e.id)),
            )
          }
          fitView
          minZoom={0.4}
          maxZoom={1.8}
        >
          <Background gap={22} color="#c9d3cd" />
          <Controls />
        </ReactFlow>
      </div>
      <div className="circuit-help">
        {t.instructions}
      </div>
      <div className="component-properties">
        {current ? (
          <>
            <b>{labels[current.data.kind as string]}</b>
            {["battery", "resistor"].includes(current.data.kind as string) && (
              <label>
                {t.value}{" "}
                <input
                  aria-label={t.valueLabel}
                  type="number"
                  min={current.data.kind === "battery" ? 1 : 0}
                  max={current.data.kind === "battery" ? 24 : 100000}
                  value={Number(current.data.value ?? 0)}
                  onChange={(e) => update({ value: Number(e.target.value) })}
                />
                {current.data.kind === "battery" ? "V" : "Ω"}
              </label>
            )}
            {current.data.kind === "switch" && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!current.data.closed}
                  onChange={(e) => update({ closed: e.target.checked })}
                />
                {t.closeSwitch}
              </label>
            )}
            <button className="danger-text" onClick={remove}>
              {t.removePart}
            </button>
          </>
        ) : (
          <span className="muted">{t.selectPart}</span>
        )}
      </div>
      <button
        className="text-button sample-button"
        onClick={() => {
          const pairs = nodes.map((n, i) => ({
            id: "loop-" + i,
            source: n.id,
            target: nodes[(i + 1) % nodes.length].id,
            style: { stroke: "#b97e34", strokeWidth: 3 },
          }));
          setEdges(pairs);
          emit(nodes, pairs);
        }}
      >
        {t.autoWire}
      </button>
    </>
  );
}
