import { ECOLOGY_POPULATIONS } from "@nexalab/sim";
import { formatCount, type EcoObservation } from "./eco-evidence";

type PopulationId = keyof typeof ECOLOGY_POPULATIONS;
type Age = Extract<EcoObservation, { setup: "age-structure" }>;

/** Top-down plot with a fixed sprinkle of plants; illustration only, not the real count. */
const PLANTS = Array.from({ length: 48 }, (_, i) => ({ x: 46 + (i % 8) * 64 + ((i * 37) % 17) - 8, y: 46 + Math.floor(i / 8) * 46 + ((i * 53) % 13) - 6 }));

export function PopulationPlot({ selected, labels }: {
  selected: PopulationId;
  labels: { title: string; illustrative: string; name: Record<string, string>; count: string; space: string; unit: Record<string, string>; table: string };
}) {
  return <div className="eco-population" data-testid="eco-population">
    <svg viewBox="0 0 560 330" role="img" aria-label={labels.title}>
      <rect className="eco-field" x="10" y="10" width="540" height="300" rx="10" />
      {[1, 2, 3, 4, 5, 6, 7].map((i) => <line key={`v${i}`} className="eco-grid" x1={10 + i * 67.5} y1="10" x2={10 + i * 67.5} y2="310" />)}
      {[1, 2, 3, 4, 5].map((i) => <line key={`h${i}`} className="eco-grid" x1="10" y1={10 + i * 50} x2="550" y2={10 + i * 50} />)}
      {PLANTS.map((plant, i) => <g key={i} transform={`translate(${plant.x} ${plant.y})`}>
        <circle className="eco-cabbage-outer" r="14" />
        <circle className="eco-cabbage-inner" r="7" />
      </g>)}
      <text className="eco-field-note" x="280" y="326" textAnchor="middle">{labels.illustrative}</text>
    </svg>
    <table className="eco-table">
      <caption>{labels.table}</caption>
      <thead><tr><th scope="col">{labels.title}</th><th scope="col">{labels.count}</th><th scope="col">{labels.space}</th></tr></thead>
      <tbody>
        {(Object.keys(ECOLOGY_POPULATIONS) as PopulationId[]).map((id) => {
          const row = ECOLOGY_POPULATIONS[id];
          return <tr key={id} data-selected={id === selected}>
            <th scope="row">{labels.name[id]}</th>
            <td>{formatCount(row.count)}</td>
            <td>{formatCount(row.amount)} {labels.unit[row.unit]}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

/** Three stacked bars, pre-reproductive at the bottom, width proportional to the count. */
export function AgePyramid({ age, labels }: {
  age: Age;
  labels: { title: string; pre: string; reproductive: string; post: string; illustrative: string };
}) {
  const rows = [
    { key: "post", name: labels.post, value: age.counts.post },
    { key: "reproductive", name: labels.reproductive, value: age.counts.reproductive },
    { key: "pre", name: labels.pre, value: age.counts.pre },
  ];
  const max = Math.max(...rows.map((row) => row.value));
  return <figure className="eco-pyramid" data-testid="eco-pyramid">
    <svg viewBox="0 0 560 230" role="img" aria-label={`${labels.title}: ${rows.map((row) => `${row.name} ${row.value}`).join(", ")}`}>
      {rows.map((row, i) => {
        const width = (row.value / max) * 360;
        return <g key={row.key} className={`eco-age eco-age-${row.key}`}>
          <rect x={300 - width / 2} y={20 + i * 64} width={width} height="52" rx="6" />
          <text className="eco-age-label" x="10" y={52 + i * 64}>{row.name}</text>
          <text className="eco-age-value" x={300 + width / 2 + 10} y={52 + i * 64}>{row.value}</text>
        </g>;
      })}
    </svg>
    <figcaption>{labels.illustrative}</figcaption>
  </figure>;
}
