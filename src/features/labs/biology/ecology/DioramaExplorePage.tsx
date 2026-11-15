/** `/labs/:id` page of kit `k8-diorama`: FL-21 removes a species from the food web, FL-20 sets a temperature. Explore only. */
import { useState } from "react";
import type { DioramaExploreConfig } from "@nexalab/sim/explore-kits";
import { fl20ToleranceResult, fl21RemovalResult } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabSpace } from "../../shared/LabSpace";
import { ExploreJournal } from "../../shared/explore/ExploreJournal";
import { foodWebSummary, toleranceSummary } from "./diorama-bench";

const SPECIES_LABEL: Record<string, string> = { co: "Cỏ", "cay-xanh": "Cây xanh", "chau-chau": "Châu chấu", sau: "Sâu", tho: "Thỏ", ech: "Ếch", "chim-sau": "Chim sâu", ran: "Rắn", cao: "Cáo", "dai-bang": "Đại bàng", "nam-vi-khuan": "Nấm, vi khuẩn" };
const label = (id: string) => SPECIES_LABEL[id] ?? id;

function FoodWebPanel({ allowed, removed, onRemove }: { allowed: string[]; removed: string | null; onRemove: (id: string) => void }) {
  const result = removed ? fl21RemovalResult(removed) : null;
  return (
    <section className="panel" data-testid="food-web-panel">
      <p>Bấm một loài để bỏ khỏi lưới thức ăn.</p>
      <div>{allowed.map((id) => <button type="button" key={id} className={removed === id ? "" : "secondary"} onClick={() => onRemove(id)}>{label(id)}</button>)}</div>
      {result?.setup === "remove" && <ul data-testid="food-web-effects">
        {Object.entries(result.effects).filter(([, effect]) => effect.effect !== "NO_DIRECT_EFFECT").map(([id, effect]) => (
          <li key={id}>{label(id)}: {effect.effect === "INCREASE" ? "tăng" : "giảm"}{effect.onlyFood ? " (mất nguồn thức ăn duy nhất)" : ""}</li>
        ))}
        <li>Chuỗi thức ăn bị đứt: {result.brokenChains}</li>
      </ul>}
    </section>
  );
}

function TolerancePanel({ speciesId, value, onChange }: { speciesId: string; value: number; onChange: (value: number) => void }) {
  const result = fl20ToleranceResult(speciesId, value);
  const text = result.zone === "WITHIN" ? "trong vùng sống" : result.zone === "BELOW_MIN" ? "dưới giới hạn dưới" : "trên giới hạn trên";
  return (
    <section className="panel" data-testid="tolerance-panel">
      <label>Nhiệt độ {(value / 10).toFixed(1)} °C <input type="range" min={0} max={500} step={10} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
      <p>Loài {label(speciesId)} {text}.</p>
    </section>
  );
}

export default function DioramaExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as DioramaExploreConfig;
  const [removed, setRemoved] = useState<string | null>(null);
  const [value, setValue] = useState(250);
  const isFoodWeb = config.catalogId === "FL-21";
  const summary = isFoodWeb
    ? (removed ? foodWebSummary(removed) : "")
    : toleranceSummary(config.spec.allowedSpecies[0], value);
  return (
    <LabSpace title={title || config.title} exitTo="/labs">
      <div data-testid="diorama-page" data-lab={labId}>
        {isFoodWeb
          ? <FoodWebPanel allowed={config.spec.allowedRemovals} removed={removed} onRemove={setRemoved} />
          : <TolerancePanel speciesId={config.spec.allowedSpecies[0]} value={value} onChange={setValue} />}
      </div>
      <ExploreJournal labId={labId} activityId={activity.id} kit={config.kit} engine={config.engine} summary={summary} canSave={!isFoodWeb || removed !== null} />
    </LabSpace>
  );
}
