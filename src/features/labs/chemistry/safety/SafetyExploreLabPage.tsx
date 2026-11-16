import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { listSafetyScenarioReagents, replaySafetyScenario, type SafetyScenarioConfig } from "@nexalab/sim/safety-scenario";
import { defineText, getLocale } from "../../../../i18n";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabSpace } from "../../shared/LabSpace";
import {
  buildObservationLogExport, createObservationLogStore, observationLogKey, OBSERVATION_LOG_LIMIT,
} from "../../shared/explore/observation-log";
import { formatSafetyHazard, listSafetyKitItems, safetyReagentLabel } from "./kit-items";
import { SafetyBenchArt } from "./SafetyBenchArt";

const text = defineText({
  vi: {
    scene: "Tình huống", items: "Vật trên bàn", observation: "Điều xảy ra", completed: "Đã hoàn thành tình huống",
    notebook: "Nhật ký quan sát", empty: "Nhật ký sẽ ghi lại lựa chọn của em.", export: "Tải nhật ký", reset: "Thử lại tình huống",
    draft: "Bản nháp đang chờ duyệt an toàn.",
    guidance: "Khi làm thí nghiệm thật, hãy theo hướng dẫn của giáo viên và quy định của trường.",
  },
  en: {
    scene: "Scenario", items: "On the bench", observation: "What happens", completed: "Scenario complete",
    notebook: "Observation log", empty: "Your choices will appear here.", export: "Download log", reset: "Try this scenario again",
    draft: "Draft awaiting safety review.",
    guidance: "In a real lab, follow your teacher’s instructions and your school’s rules.",
  },
});

type Decision = Extract<ReturnType<typeof replaySafetyScenario>, { ok: true }>["history"][number];
type LogEntry = { sceneId: string; scene: SafetyScenarioConfig["scenes"][number]["title"]; at: number } & Pick<Decision, "stepId" | "choice" | "consequence">;
const notebook = createObservationLogStore<LogEntry>("nexalab-safety-scenario");

export default function SafetyExploreLabPage({ labId, config: raw, activity }: ExplorePageProps) {
  const config = raw as SafetyScenarioConfig;
  const locale = getLocale();
  const t = text();
  const title = locale === "en" ? config.titleEn : config.title;
  const storageKey = observationLogKey(labId, activity.id);
  const [sceneId, setSceneId] = useState(config.scenes[0].id);
  const [choiceIds, setChoiceIds] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[] | null>(null);
  const saves = useRef(Promise.resolve());
  const feedback = useRef<HTMLElement>(null);
  const scene = config.scenes.find((item) => item.id === sceneId)!;
  const result = replaySafetyScenario(scene, choiceIds);
  const latest = result.ok ? result.history.at(-1) : undefined;

  useEffect(() => {
    let active = true;
    void notebook.load(storageKey).then((entries) => { if (active) setLog(entries); });
    return () => { active = false; };
  }, [storageKey]);

  useEffect(() => {
    if (latest) feedback.current?.focus();
  }, [choiceIds]);

  function choose(choiceId: string) {
    if (log === null) return;
    const nextChoices = [...choiceIds, choiceId];
    const next = replaySafetyScenario(scene, nextChoices);
    const entry = next.ok && next.history.at(-1);
    if (!entry) return;
    const updated = [...log, { ...entry, scene: scene.title, sceneId, at: Date.now() }].slice(-OBSERVATION_LOG_LIMIT);
    setChoiceIds(nextChoices);
    setLog(updated);
    saves.current = saves.current.then(() => notebook.save(storageKey, updated));
  }

  function exportLog() {
    const data = buildObservationLogExport({ labId, activityId: activity.id, engine: config.engine, title }, log ?? []);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${labId}-observations.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <LabSpace title={title} exitTo="/labs">
    <main className="safety-bench" data-testid="safety-bench">
      <header className="safety-bench__intro">
        {config.review.status === "draft" && <p className="safety-bench__draft">{t.draft}</p>}
        <p>{t.guidance}</p>
        <nav aria-label={t.scene} className="safety-bench__scenes">
          {config.scenes.map((item) => <button key={item.id} type="button" className="secondary" aria-pressed={item.id === sceneId}
            onClick={() => { if (item.id !== sceneId) { setSceneId(item.id); setChoiceIds([]); } }}>{item.title[locale]}</button>)}
        </nav>
      </header>
      <div className="safety-bench__layout">
        <section className="safety-bench__card safety-bench__scene" aria-labelledby="safety-scene-title">
          <SafetyBenchArt sceneId={scene.id} />
          <div className="safety-bench__card-inner">
            <h2 id="safety-scene-title">{scene.title[locale]}</h2>
            <p>{scene.description[locale]}</p>
            <h3>{t.items}</h3>
            <ul className="safety-bench__items">
              {listSafetyKitItems(config, scene.itemRefs).map((item) => <li key={item.id}>{item.labelVi}</li>)}
            </ul>
          </div>
        </section>
        <div className="safety-bench__flow">
          <section className="safety-bench__card safety-bench__card-inner">
            {latest && <section ref={feedback} tabIndex={-1} className="safety-bench__feedback" aria-label={t.observation} data-testid="safety-feedback">
              <h2>{t.observation}</h2>
              <p>{latest.consequence.explanation[locale]}</p>
              {listSafetyScenarioReagents(latest.consequence.hazardRefs).map((reagent) => {
                const warning = formatSafetyHazard(reagent.hazard);
                return warning && <p key={reagent.id}><strong>{safetyReagentLabel(reagent)}</strong> · {warning}</p>;
              })}
            </section>}
            {result.ok && (result.step ? <>
              <h2>{result.step.prompt[locale]}</h2>
              <div className="safety-bench__choices">
                {result.step.choices.map((choice) => <button key={choice.id} type="button" className="secondary" disabled={log === null}
                  onClick={() => choose(choice.id)}>{choice.label[locale]}</button>)}
              </div>
            </> : <div className="safety-bench__complete">
              <h2>{t.completed}</h2>
              <button type="button" className="secondary" onClick={() => setChoiceIds([])}><RotateCcw size={16} aria-hidden="true" />{t.reset}</button>
            </div>)}
          </section>
          <details className="safety-bench__card safety-bench__card-inner">
            <summary>{t.notebook}{log?.length ? ` (${log.length})` : ""}</summary>
            {log?.length ? <>
              <ol className="safety-bench__log" data-testid="safety-notebook">
                {log.map((entry, index) => <li key={index}><strong>{entry.scene[locale]} · {entry.choice.label[locale]}</strong><p>{entry.consequence.explanation[locale]}</p></li>)}
              </ol>
              <button type="button" className="secondary" onClick={exportLog}><Download size={16} aria-hidden="true" />{t.export}</button>
            </> : <p>{t.empty}</p>}
          </details>
        </div>
      </div>
    </main>
  </LabSpace>;
}
