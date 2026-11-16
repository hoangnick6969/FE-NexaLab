/**
 * `/labs/:id` page of the FL-26 Mendel bench (kit `k8-garden`), registered in `runtime/explore-registry.ts`.
 * Explore only: no LabRun, no submission, no score. The garden shows P → G → F1; the Punnett board reveals one cell
 * at a time so the student predicts before seeing the genotype, and the F1 plant of that cell flowers at the same
 * time. Ratios appear once every cell is open; the shared Explore journal keeps each cross the student saves.
 */
import { useEffect, useMemo, useState } from "react";
import { mendelCross } from "@nexalab/sim/mendel-cross";
import type { Fl26MendelConfig } from "@nexalab/sim/mendel-config";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { ExploreBenchShell } from "../../shared/explore/ExploreBenchShell";
import { MendelGardenScene, isDominant, phenotypeVi } from "./MendelGardenScene";
import { allowedCrosses, describeMendelChange, listMendelKitItems } from "./mendel-bench";
import "./mendel.css";

/** Genotypes in the model's fixed order (AA, Aa, aa) with how many of the 4 cells give each. */
function genotypeRows(counts: Record<string, number>, letter: string) {
  const upper = letter.toUpperCase(), lower = letter.toLowerCase();
  return [upper + upper, upper + lower, lower + lower].filter((genotype) => counts[genotype]).map((genotype) => ({ genotype, count: counts[genotype] }));
}
const toneOf = (genotype: string) => (genotype[0] === genotype[1] && isDominant(genotype) ? "dominant-pure" : isDominant(genotype) ? "dominant" : "recessive");

function PunnettBoard({ gametes, punnett, revealed, onReveal }: {
  gametes: [string[], string[]];
  punnett: string[][];
  revealed: ReadonlySet<string>;
  onReveal: (key: string) => void;
}) {
  return <table className="mendel-punnett" data-testid="punnett-board">
    <caption className="mendel-sr-only">Bảng Punnett: hàng là giao tử của bố, cột là giao tử của mẹ. Bấm một ô để lật.</caption>
    <thead>
      <tr>
        <th scope="col" className="mendel-corner"><span>Bố ♂ \ Mẹ ♀</span></th>
        {gametes[1].map((allele, c) => <th scope="col" key={c}>
          <span className="mendel-gamete-head" data-allele={isDominant(allele) ? "dominant" : "recessive"} aria-label={`Giao tử mẹ ${allele}`}>{allele}</span>
        </th>)}
      </tr>
    </thead>
    <tbody>
      {punnett.map((row, r) => <tr key={r}>
        <th scope="row"><span className="mendel-gamete-head" data-allele={isDominant(gametes[0][r]) ? "dominant" : "recessive"} aria-label={`Giao tử bố ${gametes[0][r]}`}>{gametes[0][r]}</span></th>
        {row.map((genotype, c) => {
          const key = `${r}:${c}`;
          const shown = revealed.has(key);
          return <td key={key}>
            <button type="button" className="mendel-cell" data-revealed={shown} data-tone={shown ? (isDominant(genotype) ? "dominant" : "recessive") : undefined}
              aria-label={shown ? `Ô ${r + 1}-${c + 1}: ${genotype}, ${phenotypeVi(genotype)}` : `Ô ${r + 1}-${c + 1}: ${gametes[0][r]} × ${gametes[1][c]}, bấm để lật`}
              aria-pressed={shown} onClick={() => onReveal(key)}>
              {shown
                ? <><b>{genotype}</b><span className="mendel-cell-pheno"><span className="mendel-cell-dot" aria-hidden="true" />{phenotypeVi(genotype)}</span></>
                : <><span className="mendel-cell-q" aria-hidden="true">?</span><small>{gametes[0][r]} + {gametes[1][c]} · bấm để lật</small></>}
            </button>
          </td>;
        })}
      </tr>)}
    </tbody>
  </table>;
}

function RatioBars({ result, letter }: { result: ReturnType<typeof mendelCross>; letter: string }) {
  const rows = genotypeRows(result.genotypeCounts, letter);
  const { dominant, recessive } = result.phenotypeCounts;
  return <div className="mendel-ratios" data-testid="mendel-ratio">
    <div>
      <div className="mendel-ratio-head"><span>Tỉ lệ kiểu gen</span><b>{result.genotypeRatio.join(" : ")}</b></div>
      <div className="mendel-ratio-bar" role="img" aria-label={`Kiểu gen: ${rows.map((row) => `${row.genotype} ${row.count}/4`).join(", ")}`}>
        {rows.map((row) => <span key={row.genotype} data-tone={toneOf(row.genotype)} style={{ flexGrow: row.count }}>{row.genotype} · {row.count}/4</span>)}
      </div>
    </div>
    <div>
      <div className="mendel-ratio-head"><span>Tỉ lệ kiểu hình (trội : lặn)</span><b>{result.phenotypeRatio.join(" : ")}</b></div>
      <div className="mendel-ratio-bar" role="img" aria-label={`Kiểu hình: hoa tím ${dominant}/4, hoa trắng ${recessive}/4`}>
        {dominant > 0 && <span data-tone="dominant" style={{ flexGrow: dominant }}>Hoa tím · {dominant}/4</span>}
        {recessive > 0 && <span data-tone="recessive" style={{ flexGrow: recessive }}>Hoa trắng · {recessive}/4</span>}
      </div>
    </div>
    <p className="mendel-ratio-text">Kiểu gen {result.genotypeRatio.join(" : ")} · Kiểu hình {result.phenotypeRatio.join(" : ")} (trội : lặn). Đây là tỉ lệ kỳ vọng trên 4 tổ hợp, không phải số cây đếm thật.</p>
  </div>;
}

export default function MendelBenchPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as Fl26MendelConfig;
  const crosses = allowedCrosses(config);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const parents = crosses[index] as [string, string];
  const result = useMemo(() => mendelCross({ setup: "monohybrid", parents }), [parents[0], parents[1]]);
  const cellCount = result.punnett.flat().length;
  const seenAll = revealed.size === cellCount;
  const letter = parents[0][0];

  useEffect(() => { setRevealed(new Set()); }, [index]);
  const reveal = (key: string) => setRevealed((prev) => new Set(prev).add(key));
  const revealAll = () => setRevealed(new Set(result.punnett.flatMap((row, r) => row.map((_, c) => `${r}:${c}`))));

  const scene = <>
    <header className="explore-scene-head">
      <div><span className="explore-scene-eyebrow">Vườn thực nghiệm · k8-garden</span><h2>P {parents[0]} × {parents[1]} → giao tử G → đời con F1</h2></div>
      <span className="explore-status" data-tone={seenAll ? "ok" : "info"} data-testid="mendel-progress">Đã lật {revealed.size}/{cellCount} ô</span>
    </header>
    <div className="mendel-layout">
      <MendelGardenScene parents={parents} gametes={result.gametes} punnett={result.punnett} revealed={revealed} />
      <section className="mendel-board-card" aria-labelledby="mendel-board-title">
        <div className="mendel-board-head">
          <h3 id="mendel-board-title">Bảng Punnett 2 × 2</h3>
          <span className="mendel-progress">{revealed.size}/{cellCount}</span>
        </div>
        <PunnettBoard gametes={result.gametes} punnett={result.punnett} revealed={revealed} onReveal={reveal} />
        {seenAll
          ? <RatioBars result={result} letter={letter} />
          : <p className="mendel-hint">Dự đoán kiểu gen của từng ô trước, rồi bấm để lật. Tỉ lệ hiện ra khi em đã mở đủ {cellCount} ô.</p>}
      </section>
    </div>
  </>;

  const controls = <>
    <label className="explore-field">Cặp lai P (bố × mẹ)
      <select className="explore-select" value={index} onChange={(event) => setIndex(Number(event.target.value))} aria-label="Cặp lai">
        {crosses.map(([a, b], i) => <option key={`${a}-${b}`} value={i}>{a} × {b}</option>)}
      </select>
      <span className="explore-field-hint">Chữ hoa là alen trội (hoa tím), chữ thường là alen lặn (hoa trắng).</span>
    </label>
    <dl className="mendel-parents">
      <dt>Bố {parents[0]}</dt><dd>{phenotypeVi(parents[0])} · giao tử {result.gametes[0].join(", ")}</dd>
      <dt>Mẹ {parents[1]}</dt><dd>{phenotypeVi(parents[1])} · giao tử {result.gametes[1].join(", ")}</dd>
    </dl>
    <div className="explore-journal-actions">
      <button type="button" className="explore-btn explore-btn-secondary" onClick={revealAll} disabled={seenAll}>Lật tất cả</button>
      <button type="button" className="explore-btn explore-btn-secondary" onClick={() => setRevealed(new Set())} disabled={!revealed.size}>Úp lại các ô</button>
    </div>
  </>;

  const readout = seenAll
    ? <dl>
        <dt>Kiểu gen F1</dt><dd className="explore-mono">{result.genotypeRatio.join(" : ")}</dd>
        <dt>Kiểu hình F1</dt><dd className="explore-mono">{result.phenotypeRatio.join(" : ")}</dd>
      </dl>
    : <p className="explore-field-hint">Tỉ lệ kiểu gen và kiểu hình sẽ hiện ở đây khi em đã lật đủ {cellCount} ô Punnett.</p>;

  return <ExploreBenchShell labId={labId} activityId={activity.id} title={title || config.title} config={config} kitItems={listMendelKitItems(config)}
    scene={scene} controls={controls} readout={readout} testId="mendel-bench"
    journalSummary={describeMendelChange(parents)} canSave={seenAll} saveHint={`Lật đủ ${cellCount} ô Punnett để lưu cặp lai này.`}
    draftNoticeVi="Dữ liệu di truyền của bài này là bản nháp, đang chờ giáo viên sinh học duyệt." />;
}
