/**
 * `/labs/:id` page of the FL-26 Mendel bench (kit `k8-garden`), registered in `runtime/explore-registry.ts`.
 * Explore only: no LabRun, no submission, no score. The Punnett board reveals one cell at a time so the
 * student predicts before seeing the genotype; the journal keeps each cross the student saves.
 */
import { useEffect, useMemo, useState } from "react";
import { mendelCross } from "@nexalab/sim/mendel-cross";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabSpace } from "../../shared/LabSpace";
import { buildObservationLogExport, createObservationLogStore, observationLogKey } from "../../shared/explore/observation-log";
import type { Fl26MendelConfig } from "@nexalab/sim/mendel-config";
import { allowedCrosses, describeMendelChange, listMendelKitItems } from "./mendel-bench";

export type MendelJournalEntry = { at: string; parents: [string, string]; note: string; summary: string };
const journal = createObservationLogStore<MendelJournalEntry>("nexalab-fl26-observation-log");

const phenotypeOf = (genotype: string) => (genotype[0] === genotype[0].toUpperCase() ? "trội" : "lặn");

export default function MendelBenchPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as Fl26MendelConfig;
  const crosses = allowedCrosses(config);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<MendelJournalEntry[]>([]);
  const [note, setNote] = useState("");
  const logKey = observationLogKey(labId, activity.id);
  const parents = crosses[index] as [string, string];
  const result = useMemo(() => mendelCross({ setup: "monohybrid", parents }), [parents[0], parents[1]]);
  const cells = result.punnett.flatMap((row, r) => row.map((genotype, c) => ({ key: `${r}:${c}`, genotype })));
  const seenAll = cells.every((cell) => revealed.has(cell.key));
  const draft = config.review.status !== "reviewed";

  useEffect(() => { void journal.load(logKey).then(setEntries); }, [logKey]);
  useEffect(() => { setRevealed(new Set()); }, [index]);

  const reveal = (key: string) => setRevealed((prev) => new Set(prev).add(key));

  async function saveEntry() {
    const next = [...entries, { at: new Date().toISOString(), parents, note: note.trim(), summary: describeMendelChange(parents) }];
    setEntries(next);
    setNote("");
    await journal.save(logKey, next);
  }

  function exportJournal() {
    const payload = buildObservationLogExport({ labId, activityId: activity.id, kit: config.kit, engine: config.engine }, entries);
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${labId}-nhat-ky.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <LabSpace title={title || config.title} exitTo="/labs">
      <section className="panel" data-testid="mendel-bench" data-activity={activity.id}>
        {draft && <p role="note">Dữ liệu di truyền của bài này là bản nháp, đang chờ giáo viên sinh học duyệt.</p>}
        <h2>Dụng cụ và thành phần</h2>
        <ul>{listMendelKitItems(config).map((item) => <li key={item.id}><b>{item.labelVi}</b> · {item.purposeVi}</li>)}</ul>

        <h2>Chọn cặp bố mẹ</h2>
        <label>
          Cặp lai{" "}
          <select value={index} onChange={(event) => setIndex(Number(event.target.value))} aria-label="Cặp lai">
            {crosses.map(([a, b], i) => <option key={`${a}-${b}`} value={i}>{a} × {b}</option>)}
          </select>
        </label>
        <p>Giao tử bố: {result.gametes[0].join(", ")} · Giao tử mẹ: {result.gametes[1].join(", ")}</p>

        <h2>Ma trận Punnett</h2>
        <table data-testid="punnett-board">
          <thead>
            <tr>
              <th scope="col">{}</th>
              {result.gametes[1].map((g, c) => <th scope="col" key={c}>{g}</th>)}
            </tr>
          </thead>
          <tbody>
            {result.punnett.map((row, r) => (
              <tr key={r}>
                <th scope="row">{result.gametes[0][r]}</th>
                {row.map((genotype, c) => {
                  const key = `${r}:${c}`;
                  const shown = revealed.has(key);
                  return (
                    <td key={key}>
                      <button type="button" className="secondary" onClick={() => reveal(key)} aria-label={`Ô ${r + 1}-${c + 1}`}>
                        {shown ? `${genotype} · ${phenotypeOf(genotype)}` : "Dự đoán, rồi bấm"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p>Đã xem {revealed.size}/{cells.length} ô.</p>
        {seenAll && <p data-testid="mendel-ratio">Kiểu gen {result.genotypeRatio.join(" : ")} · Kiểu hình {result.phenotypeRatio.join(" : ")} (trội : lặn)</p>}
      </section>

      <section className="panel" data-testid="mendel-journal">
        <h2>Nhật ký</h2>
        <label>
          Ghi chú quan sát
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </label>
        <button type="button" onClick={saveEntry} disabled={!seenAll}>Lưu cặp lai này vào nhật ký</button>
        <button type="button" className="secondary" onClick={exportJournal} disabled={!entries.length}>Xuất nhật ký (JSON)</button>
        <ol>
          {entries.map((entry) => <li key={entry.at}><b>{entry.summary}</b>{entry.note ? ` — ${entry.note}` : ""}</li>)}
        </ol>
      </section>
    </LabSpace>
  );
}
