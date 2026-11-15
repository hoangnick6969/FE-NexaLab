/** `/labs/:id` page of kit `anatomy` (FL-16 studio): pick a released eye scenario and read the lens power it needs. Explore only. */
import { useState } from "react";
import { EYE_OPTICS_SCENARIOS } from "@nexalab/sim/eye-optics";
import type { AnatomyExploreConfig } from "@nexalab/sim/explore-kits";
import { fl16PowerResult } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabSpace } from "../../shared/LabSpace";
import { ExploreJournal } from "../../shared/explore/ExploreJournal";
import { anatomySummary } from "./anatomy-bench";

export default function AnatomyExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as AnatomyExploreConfig;
  const scenarios = EYE_OPTICS_SCENARIOS.filter((item) => config.spec.allowedScenarios.includes(item.id));
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? "");
  const scenario = scenarios.find((item) => item.id === scenarioId);
  const result = scenarioId ? fl16PowerResult(scenarioId) : null;
  return (
    <LabSpace title={title || config.title} exitTo="/labs">
      <section className="panel" data-testid="anatomy-page" data-lab={labId}>
        <label>Kịch bản{" "}
          <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} aria-label="Kịch bản">
            {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        {scenario && result && <p data-testid="eye-power">Độ tụ cần có: {result.powerD.toFixed(2)} D (chiều dài trục mắt {(scenario.axialLengthM * 1000).toFixed(1)} mm).</p>}
      </section>
      {scenarioId && <ExploreJournal labId={labId} activityId={activity.id} kit={config.kit} engine={config.engine} summary={anatomySummary(scenarioId)} canSave />}
    </LabSpace>
  );
}
