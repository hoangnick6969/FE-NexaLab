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
