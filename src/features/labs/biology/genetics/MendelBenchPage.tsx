/**
 * `/labs/:id` page of the FL-26 Mendel bench (kit `k8-garden`), registered in `runtime/explore-registry.ts`.
 * Explore only: no LabRun, no submission, no score. The garden shows P → G → F1; the Punnett board reveals one cell
 * at a time so the student predicts before seeing the genotype, and the F1 plant of that cell flowers at the same
 * time. Ratios appear once every cell is open; the shared Explore journal keeps each cross the student saves.
 * The spec asks for a 2D bench (INC-2 D2-2.1; catalog K8 "2D-first, 3D tuỳ chọn"). Like the other Sinh học benches
 * the header offers 3D where WebGL works: the same garden on the K8 meadow stage (`MendelGarden3D`), with the
 * Punnett board as an overlay card. 2D stays the fallback.
 */
import { useEffect, useMemo, useState } from "react";
import { mendelCross } from "@nexalab/sim/mendel-cross";
import type { Fl26MendelConfig } from "@nexalab/sim/mendel-config";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { ExploreBenchShell, canUseWebgl } from "../../shared/explore/ExploreBenchShell";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { LabRendererToggle } from "../../shared/LabRendererToggle";
import { MendelGarden3D } from "./MendelGarden3D";
import type { CarriedGamete, GardenHandlers } from "./garden-interaction";
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
  const [can3d] = useState(canUseWebgl);
  const [view, setView] = useState<"3d" | "2d">(can3d ? "3d" : "2d");
  const shown = can3d ? view : "2d";
  const toggle = can3d ? <LabHeaderSlot><LabRendererToggle mode={shown} onChange={setView} /></LabHeaderSlot> : null;

  // Direct manipulation on the garden (2D and 3D): carried gamete, gametes already in each pot, last message.
  const [carrying, setCarrying] = useState<CarriedGamete | null>(null);
  const [drops, setDrops] = useState<Record<string, { father?: boolean; mother?: boolean }>>({});
  const [gardenNote, setGardenNote] = useState<{ tone: "ok" | "warn" | "info"; text: string } | null>(null);
  useEffect(() => { setRevealed(new Set()); setDrops({}); setCarrying(null); }, [index]);
  const reveal = (key: string) => setRevealed((prev) => new Set(prev).add(key));
  const cellOf = (key: string) => key.split(":").map(Number) as [number, number];

  /** Click on a P plant: next allowed cross that changes this parent, keeping the other one when the Lab allows it. */
  const cycleParent = (parent: 0 | 1) => {
    const order = crosses.map((_, i) => (index + 1 + i) % crosses.length);
    const keep = order.find((i) => crosses[i][parent] !== parents[parent] && crosses[i][1 - parent] === parents[1 - parent]);
    const any = order.find((i) => crosses[i][parent] !== parents[parent]);
    const next = keep ?? any;
    if (next === undefined) { setGardenNote({ tone: "info", text: "Bài này không có cặp lai nào khác cho cây này." }); return; }
    setIndex(next);
    setGardenNote({ tone: "info", text: `${parent === 0 ? "Bố" : "Mẹ"} đổi thành ${crosses[next][parent]}: cặp lai mới ${crosses[next][0]} × ${crosses[next][1]}.` });
  };
  const dropOn = (key: string) => {
    if (!carrying) return;
    const [r, c] = cellOf(key);
    const needed = carrying.parent === 0 ? result.gametes[0][r] : result.gametes[1][c];
    const who = carrying.parent === 0 ? "bố" : "mẹ";
    setCarrying(null);
    if (revealed.has(key)) { setGardenNote({ tone: "info", text: "Cây này đã mở rồi." }); return; }
    if (carrying.allele !== needed) {
      setGardenNote({ tone: "warn", text: `Chậu này (ô ${r + 1}-${c + 1}) nhận giao tử ${needed} của ${who}, không phải ${carrying.allele}. Nhìn hàng/cột của ô trong bảng Punnett.` });
      return;
    }
    const next = { ...drops[key], [carrying.parent === 0 ? "father" : "mother"]: true };
    setDrops((prev) => ({ ...prev, [key]: next }));
    if (next.father && next.mother) {
      reveal(key);
      setGardenNote({ tone: "ok", text: `${result.gametes[0][r]} (bố) + ${result.gametes[1][c]} (mẹ) → ${result.punnett[r][c]}: ${phenotypeVi(result.punnett[r][c])}.` });
    } else {
      setGardenNote({ tone: "info", text: `Đã thả ${carrying.allele} của ${who}. Thả tiếp giao tử của ${carrying.parent === 0 ? "mẹ" : "bố"} vào chậu này.` });
    }
  };
  const handlers: GardenHandlers = {
    onParent: cycleParent,
    onGameteDown: (parent, allele, event) => {
      event.preventDefault();
      // Touch pointers are captured by the element they start on; release so the pot under the finger gets pointer-up.
      (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
      setCarrying({ parent, allele });
      setGardenNote({ tone: "info", text: `Đang cầm giao tử ${allele} của ${parent === 0 ? "bố" : "mẹ"}: thả vào một chậu F1. Esc hoặc chuột phải để bỏ.` });
    },
    onPotUp: dropOn,
    onPot: (key) => { if (carrying) dropOn(key); else reveal(key); },
    carrying,
    drops,
  };
  // The carried gamete follows the pointer until it is dropped on a pot (release over it, or click it); a release
  // anywhere else keeps it in hand so the student can still click a pot. Esc or right-click puts it down.
  useEffect(() => {
    if (!carrying) return;
    const chip = document.createElement("span");
    chip.className = "mendel-carry-chip";
    chip.dataset.allele = isDominant(carrying.allele) ? "dominant" : "recessive";
    chip.textContent = carrying.allele;
    chip.setAttribute("aria-hidden", "true");
    document.body.appendChild(chip);
    const move = (event: PointerEvent) => { chip.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`; };
    const drop = () => { setCarrying(null); setGardenNote(null); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") drop(); };
    const context = (event: MouseEvent) => { event.preventDefault(); drop(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("keydown", key);
    window.addEventListener("contextmenu", context);
    return () => { chip.remove(); window.removeEventListener("pointermove", move); window.removeEventListener("keydown", key); window.removeEventListener("contextmenu", context); };
  }, [carrying]);
  const revealAll = () => setRevealed(new Set(result.punnett.flatMap((row, r) => row.map((_, c) => `${r}:${c}`))));

  const boardCard = <section className="mendel-board-card" aria-labelledby="mendel-board-title">
    <div className="mendel-board-head">
      <h3 id="mendel-board-title">Bảng Punnett 2 × 2</h3>
      <span className="mendel-progress">{revealed.size}/{cellCount}</span>
    </div>
    <PunnettBoard gametes={result.gametes} punnett={result.punnett} revealed={revealed} onReveal={reveal} />
    {seenAll
      ? <RatioBars result={result} letter={letter} />
      : <p className="mendel-hint">Dự đoán kiểu gen của từng ô trước, rồi bấm để lật. Tỉ lệ hiện ra khi em đã mở đủ {cellCount} ô.</p>}
  </section>;

  const scene = shown === "3d" ? <>
    {toggle}
    <MendelGarden3D parents={parents} gametes={result.gametes} punnett={result.punnett} revealed={revealed} layoutKey={`garden-${index}-${seenAll}`} handlers={handlers} />
  </> : <>
    {toggle}
    <header className="explore-scene-head">
      <div><span className="explore-scene-eyebrow">Vườn thực nghiệm · k8-garden</span><h2>P {parents[0]} × {parents[1]} → giao tử G → đời con F1</h2></div>
      <span className="explore-status" data-tone={seenAll ? "ok" : "info"} data-testid="mendel-progress">Đã lật {revealed.size}/{cellCount} ô</span>
    </header>
    <div className="mendel-layout">
      <div className="mendel-garden-col">
        <MendelGardenScene parents={parents} gametes={result.gametes} punnett={result.punnett} revealed={revealed} handlers={handlers} />
        <p className="explore-feedback" data-tone={gardenNote?.tone ?? "info"} aria-live="polite" data-testid="garden-note">{gardenNote?.text ?? "Bấm cây bố hoặc mẹ để đổi kiểu gen; bấm cây F1 để mở, hoặc kéo giao tử thả vào cây F1."}</p>
      </div>
      {boardCard}
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
    {/* In 3D the garden fills the scene, so the hint, the garden feedback and the Punnett board sit in the control
        column instead of over the plants (an overlay card would cover the F1 pots the student drops gametes on). */}
    {shown === "3d" && <>
      <p className="explore-field-hint">Trên vườn: bấm cây bố hoặc mẹ để đổi kiểu gen; bấm một chậu F1 để mở, hoặc kéo giao tử của bố và của mẹ thả vào chậu. Kéo nền để xoay vườn.</p>
      <span className="explore-status" data-tone={seenAll ? "ok" : "info"} data-testid="mendel-progress">Đã lật {revealed.size}/{cellCount} ô</span>
      {gardenNote && <p className="explore-feedback" data-tone={gardenNote.tone} aria-live="polite" data-testid="garden-note">{gardenNote.text}</p>}
      <div className="mendel-aside-board">{boardCard}</div>
    </>}
  </>;

  const readout = seenAll
    ? <dl>
        <dt>Kiểu gen F1</dt><dd className="explore-mono">{result.genotypeRatio.join(" : ")}</dd>
        <dt>Kiểu hình F1</dt><dd className="explore-mono">{result.phenotypeRatio.join(" : ")}</dd>
      </dl>
    : <p className="explore-field-hint">Tỉ lệ kiểu gen và kiểu hình sẽ hiện ở đây khi em đã lật đủ {cellCount} ô Punnett.</p>;

  return <ExploreBenchShell labId={labId} activityId={activity.id} title={title || config.title} config={config} kitItems={listMendelKitItems(config)}
    scene={scene} controls={controls} readout={readout} sceneKind={shown === "3d" ? "full" : "card"} testId="mendel-bench"
    journalSummary={describeMendelChange(parents)} canSave={seenAll} saveHint={`Lật đủ ${cellCount} ô Punnett để lưu cặp lai này.`}
    draftNoticeVi="Dữ liệu di truyền của bài này là bản nháp, đang chờ giáo viên sinh học duyệt." />;
}
