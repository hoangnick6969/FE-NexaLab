/**
 * `/labs/:id` page of the FL-26 Mendel bench (kit `k8-garden`), registered in `runtime/explore-registry.ts`.
 * Explore only: no LabRun, no submission, no score. The Punnett board reveals one cell at a time so the
 * student predicts before seeing the genotype; the shared Explore journal keeps each cross the student saves.
 */
import { useEffect, useMemo, useState } from "react";
import { mendelCross } from "@nexalab/sim/mendel-cross";
import type { Fl26MendelConfig } from "@nexalab/sim/mendel-config";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabSpace } from "../../shared/LabSpace";
import { ExploreJournal } from "../../shared/explore/ExploreJournal";
import { allowedCrosses, describeMendelChange, listMendelKitItems } from "./mendel-bench";

const phenotypeOf = (genotype: string) => (genotype[0] === genotype[0].toUpperCase() ? "trội" : "lặn");

export default function MendelBenchPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as Fl26MendelConfig;
  const crosses = allowedCrosses(config);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const parents = crosses[index] as [string, string];
  const result = useMemo(() => mendelCross({ setup: "monohybrid", parents }), [parents[0], parents[1]]);
  const cells = result.punnett.flatMap((row, r) => row.map((genotype, c) => ({ key: `${r}:${c}`, genotype })));
  const seenAll = cells.every((cell) => revealed.has(cell.key));
  const draft = config.review.status !== "reviewed";

  useEffect(() => { setRevealed(new Set()); }, [index]);

  const reveal = (key: string) => setRevealed((prev) => new Set(prev).add(key));

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
              <th scope="col" />
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

      <ExploreJournal labId={labId} activityId={activity.id} kit={config.kit} engine={config.engine} summary={describeMendelChange(parents)} canSave={seenAll} />
    </LabSpace>
  );
}
