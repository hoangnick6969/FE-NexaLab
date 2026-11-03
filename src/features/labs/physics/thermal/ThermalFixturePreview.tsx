import { useMemo, useRef, useState } from "react";
import { ThermalEnergyActivity } from "./ThermalEnergyActivity";
import { api } from "../../../../lib/api";
import { LabSpace } from "../../shared/LabSpace";
import { evaluateThermalBench } from "@nexalab/sim";
import type { ThermalEvent } from "./thermal-readings";

/** Development fixture only: exercises the production UI without creating learning evidence. */
export default function ThermalFixturePreview() {
  const events = useRef<ThermalEvent[]>([]);
  const keys = useRef(new Map<string, string>());
  const [run, setRun] = useState(1);
  const [attempt, setAttempt] = useState<any>(null);
  const transport = useMemo(() => (async (_path: string, method?: string, body?: any) => {
    if (method === "POST") {
      const serialized = JSON.stringify(body.event), previous = keys.current.get(body.idempotencyKey);
      if (previous && previous !== serialized) throw new Error("Fixture idempotency conflict");
      if (!previous) { keys.current.set(body.idempotencyKey, serialized); events.current.push(body.event); }
    }
    const observations = [0, ...(events.current.length >= 2 ? [50000] : []), ...(events.current.length >= 4 ? [100000] : [])].map(elapsedMilliseconds => {
      const result = evaluateThermalBench({ fixtureId: "water-calorimeter-v1", elapsedMilliseconds });
      if (!result.ok) throw new Error(result.code);
      return result.value;
    });
    return { events: [...events.current], observations, observation: { ok: true, value: observations[observations.length - 1] } };
  }) as typeof api, [run]);
  return <LabSpace title="Năng lượng nhiệt · FL-07 (fixture)" exitTo="/labs"><ThermalEnergyActivity key={run} runId={`fixture-${run}`} transport={transport}
    onSubmit={() => setAttempt({ verdict: "fixture_complete" })} onNewRun={() => { events.current = []; keys.current.clear(); setAttempt(null); setRun(run + 1); }}
    attempt={attempt} pendingSubmit={false} fixture/></LabSpace>;
}
