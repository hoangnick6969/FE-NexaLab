import { useState } from "react";
import { ArrowRight, Check, CircleHelp, Compass, Info, Play, RotateCcw, Undo2, X } from "lucide-react";
import { FOOD_WEB_CAUSES, foodWebChains } from "@nexalab/sim";
import { defineText } from "../../../../../i18n";
import { EnergyPyramid, FoodWebScene } from "./FoodWebScene";
import {
  ASKED, CAUSE_IDS, DECIMAL_PATTERN, EFFECTS, ENERGY_CHAIN, FW_STEP_COUNT, MAX_CHAIN, ROLES, ROLE_ITEMS,
  chainState, fwEvidenceFrom, fwPhaseOf, fwStepNumber, previewFw,
  type CauseId, type Effect, type FwCheckpointId, type FwEvidence, type FwPrediction, type Role, type RolesAnswer, type SpeciesId,
} from "./fw-evidence";
import "./FoodWebActivity.css";

const text = defineText({
  vi: {
    title: "Lưới thức ăn và cân bằng tự nhiên",
    discipline: "Sinh học 8, hệ sinh thái",
    step: (n: number) => `Bước ${n}/${FW_STEP_COUNT}`,
    questions: "Câu hỏi", closeQuestions: "Đóng câu hỏi",
    answerLegend: "Câu trả lời của em",
    hint: "Trả lời trước, rồi mới kiểm tra trên sa bàn.",
    question: {
      ROLES: "Xếp mỗi sinh vật dưới đây vào nhóm sinh vật sản xuất, tiêu thụ hoặc phân giải.",
      CHAIN: "Bấm lần lượt các loài trên sa bàn để dựng một chuỗi thức ăn có ít nhất 4 mắt xích, bắt đầu từ sinh vật sản xuất.",
      ENERGY: "Trong chuỗi Cỏ → Châu chấu → Ếch → Rắn, cỏ tích luỹ 10 000 kJ. Mỗi bậc chỉ chuyển được 1/10 năng lượng sang bậc sau. Rắn nhận được bao nhiêu kJ?",
      HUNT: "Con người săn bắt hết rắn trong khu vực này. Theo em, số lượng ếch sẽ thế nào?",
      DEFOREST: "Cây xanh bị chặt phá hết. Theo em, số lượng sâu ăn lá sẽ thế nào?",
      CAUSES: "Chọn tất cả các hoạt động của con người gây mất cân bằng tự nhiên.",
    } as Record<FwCheckpointId, string>,
    actPrompt: {
      ROLES: "Bấm “Kiểm tra” để xem vai trò của từng sinh vật trên sa bàn.",
      CHAIN: "",
      ENERGY: "Bấm “Xem tháp năng lượng” để kiểm tra.",
      HUNT: "Bấm “Loại bỏ rắn” để xem ảnh hưởng trực tiếp trên lưới thức ăn.",
      DEFOREST: "Bấm “Loại bỏ cây xanh” để xem ảnh hưởng trực tiếp.",
      CAUSES: "Bấm “Kiểm tra” để xem mỗi hoạt động tác động tới lưới thức ăn thế nào.",
    } as Record<FwCheckpointId, string>,
    action: {
      ROLES: "Kiểm tra", CHAIN: "Kiểm tra chuỗi", ENERGY: "Xem tháp năng lượng",
      HUNT: "Loại bỏ rắn", DEFOREST: "Loại bỏ cây xanh", CAUSES: "Kiểm tra",
    } as Record<FwCheckpointId, string>,
    save: "Ghi câu trả lời",
    next: "Câu tiếp theo",
    names: {
      co: "Cỏ", "cay-xanh": "Cây xanh", "chau-chau": "Châu chấu", sau: "Sâu ăn lá", tho: "Thỏ",
      ech: "Ếch", "chim-sau": "Chim sâu", ran: "Rắn", cao: "Cáo", "dai-bang": "Đại bàng", "nam-vi-khuan": "Nấm, vi khuẩn",
    } as Record<SpeciesId, string>,
    roles: { PRODUCER: "Sản xuất", CONSUMER: "Tiêu thụ", DECOMPOSER: "Phân giải" } as Record<Role, string>,
    effects: { INCREASE: "Tăng lên", DECREASE: "Giảm đi", NO_DIRECT_EFFECT: "Không bị ảnh hưởng trực tiếp" } as Record<Effect, string>,
    removed: "đã bị loại bỏ",
    causes: {
      "pha-rung": "Phá rừng", "san-bat": "Săn bắt động vật hoang dã", "khai-thac": "Khai thác tài nguyên quá mức",
      "o-nhiem": "Xả chất thải gây ô nhiễm", "trong-rung": "Trồng rừng", "bao-ton": "Lập khu bảo tồn",
    } as Record<CauseId, string>,
    causeResult: (name: string) => `Gây mất cân bằng: lưới thức ăn mất ${name.toLowerCase()}.`,
    causeProtects: "Giúp bảo vệ, duy trì cân bằng tự nhiên.",
    chainNow: "Chuỗi của em",
    chainEmpty: "Chưa chọn loài nào.",
    undo: "Bỏ mắt xích cuối", clear: "Xoá chuỗi",
    chainValid: (n: number) => `Chuỗi hợp lệ: ${n} mắt xích, mỗi loài là thức ăn của loài đứng sau.`,
    chainShort: (n: number) => `Chuỗi hợp lệ nhưng chỉ có ${n} mắt xích; câu này cần ít nhất 4.`,
    chainNoProducer: "Các mắt xích nối đúng, nhưng chuỗi thức ăn phải bắt đầu từ sinh vật sản xuất.",
    chainBroken: (a: string, b: string) => `Chuỗi bị đứt: ${b} không ăn ${a.toLowerCase()} trong lưới này (mũi tên đỏ nét đứt).`,
    rolesResult: "Cỏ là sinh vật sản xuất, ếch là sinh vật tiêu thụ, nấm và vi khuẩn là sinh vật phân giải.",
    energyResult: "Mỗi bậc chỉ giữ 1/10 năng lượng; phần còn lại được sinh vật sử dụng và mất đi dưới dạng nhiệt. Rắn nhận được 10 kJ.",
    removeResult: (removed: string, asked: string, effect: string, broken: number) => `Mất ${removed.toLowerCase()}: ${asked.toLowerCase()} ${effect.toLowerCase()}. ${broken} chuỗi thức ăn bị đứt.`,
    causesResult: "Phá rừng, săn bắt, khai thác quá mức và ô nhiễm làm mất mắt xích của lưới thức ăn. Trồng rừng và lập khu bảo tồn giúp duy trì cân bằng.",
    explanation: "Vì sao săn bắt hết rắn có thể làm mất cân bằng tự nhiên?",
    a: "Rắn là một mắt xích trong lưới thức ăn; mất rắn thì con mồi của nó không còn bị khống chế và kẻ thù của nó mất nguồn thức ăn.",
    b: "Vì rắn là sinh vật sản xuất của hệ sinh thái.",
    c: "Vì không còn rắn thì cỏ và cây xanh không mọc được.",
    ready: "Em đã hoàn thành các câu hỏi và phần giải thích.",
    sceneLabel: "Sa bàn lưới thức ăn: mũi tên đi từ thức ăn tới sinh vật ăn nó.",
    illustrative: "Lưới thức ăn minh hoạ, không phải số liệu SGK. Mũi tên chỉ từ thức ăn tới sinh vật ăn nó; đường nét đứt là xác và chất thải tới sinh vật phân giải.",
    pyramid: { title: "Tháp năng lượng của chuỗi Cỏ → Châu chấu → Ếch → Rắn", unit: "kJ", heat: "mất dưới dạng nhiệt:", unknown: "? kJ", note: "Quy ước minh hoạ 1/10; độ rộng các bậc không theo tỉ lệ." },
    modelLimit: "Mô hình đơn giản: lưới thức ăn minh hoạ, chỉ xét ảnh hưởng trực tiếp lên con mồi và kẻ thù của loài bị mất. Trong tự nhiên, ảnh hưởng còn lan rộng và thay đổi theo thời gian.",
    energyUnit: "Năng lượng (kJ)", invalidNumber: "Nhập một số, ví dụ 25 hoặc 2,5.",
    explore: {
      show: "Khám phá thêm", hide: "Đóng khám phá", title: "Khám phá tự do",
      intro: "Bấm một loài trên sa bàn để loại bỏ nó và xem ảnh hưởng trực tiếp. Phần này không được chấm điểm và không được lưu.",
      reset: "Khôi phục lưới", links: "Số chuỗi thức ăn đi qua mỗi loài (loài có từ 2 chuỗi trở lên là mắt xích chung):",
      chains: (n: number) => `${n} chuỗi`,
    },
  },
  en: {
    title: "Food webs and natural balance",
    discipline: "Biology 8, ecosystems",
    step: (n: number) => `Step ${n}/${FW_STEP_COUNT}`,
    questions: "Questions", closeQuestions: "Close questions",
    answerLegend: "Your answer",
    hint: "Answer first, then check on the board.",
    question: {
      ROLES: "Sort each organism below into producer, consumer or decomposer.",
      CHAIN: "Tap species on the board in order to build a food chain of at least 4 links, starting from a producer.",
      ENERGY: "In the chain Grass → Grasshopper → Frog → Snake, the grass stores 10,000 kJ. Each level passes on only 1/10. How many kJ reach the snake?",
      HUNT: "People hunt every snake in this area. What happens to the number of frogs?",
      DEFOREST: "All the trees are cut down. What happens to the number of caterpillars?",
      CAUSES: "Select every human activity that upsets natural balance.",
    } as Record<FwCheckpointId, string>,
    actPrompt: {
      ROLES: "Press “Check” to see each organism's role on the board.",
      CHAIN: "",
      ENERGY: "Press “Show the energy pyramid” to check.",
      HUNT: "Press “Remove the snake” to see the direct effects on the web.",
      DEFOREST: "Press “Remove the trees” to see the direct effects.",
      CAUSES: "Press “Check” to see how each activity affects the web.",
    } as Record<FwCheckpointId, string>,
    action: {
      ROLES: "Check", CHAIN: "Check the chain", ENERGY: "Show the energy pyramid",
      HUNT: "Remove the snake", DEFOREST: "Remove the trees", CAUSES: "Check",
    } as Record<FwCheckpointId, string>,
    save: "Save answer",
    next: "Next question",
    names: {
      co: "Grass", "cay-xanh": "Trees", "chau-chau": "Grasshopper", sau: "Caterpillar", tho: "Rabbit",
      ech: "Frog", "chim-sau": "Warbler", ran: "Snake", cao: "Fox", "dai-bang": "Eagle", "nam-vi-khuan": "Fungi, bacteria",
    } as Record<SpeciesId, string>,
    roles: { PRODUCER: "Producer", CONSUMER: "Consumer", DECOMPOSER: "Decomposer" } as Record<Role, string>,
    effects: { INCREASE: "Increases", DECREASE: "Decreases", NO_DIRECT_EFFECT: "No direct effect" } as Record<Effect, string>,
    removed: "removed",
    causes: {
      "pha-rung": "Deforestation", "san-bat": "Hunting wild animals", "khai-thac": "Overexploiting resources",
      "o-nhiem": "Dumping polluting waste", "trong-rung": "Planting forests", "bao-ton": "Creating nature reserves",
    } as Record<CauseId, string>,
    causeResult: (name: string) => `Upsets the balance: the web loses ${name.toLowerCase()}.`,
    causeProtects: "Helps protect and maintain natural balance.",
    chainNow: "Your chain",
    chainEmpty: "No species chosen yet.",
    undo: "Remove the last link", clear: "Clear the chain",
    chainValid: (n: number) => `A valid chain of ${n} links: each species is food for the next.`,
    chainShort: (n: number) => `A valid chain, but only ${n} links; this question needs at least 4.`,
    chainNoProducer: "The links are right, but a food chain must start from a producer.",
    chainBroken: (a: string, b: string) => `The chain breaks: ${b} does not eat ${a.toLowerCase()} in this web (red dashed arrow).`,
    rolesResult: "Grass is a producer, the frog is a consumer, fungi and bacteria are decomposers.",
    energyResult: "Each level keeps only 1/10 of the energy; the rest is used and lost as heat. The snake receives 10 kJ.",
    removeResult: (removed: string, asked: string, effect: string, broken: number) => `Without ${removed.toLowerCase()}: ${asked.toLowerCase()} ${effect.toLowerCase()}. ${broken} food chains break.`,
    causesResult: "Deforestation, hunting, overexploitation and pollution remove links from the food web. Planting forests and reserves help keep the balance.",
    explanation: "Why can hunting every snake upset natural balance?",
    a: "The snake is a link in the food web; without it, its prey are no longer kept in check and its predators lose a food source.",
    b: "Because the snake is the ecosystem's producer.",
    c: "Because without snakes grass and trees cannot grow.",
    ready: "You have completed the questions and your explanation.",
    sceneLabel: "Food-web board: arrows point from food to the organism that eats it.",
    illustrative: "An illustrative food web, not textbook data. Arrows point from food to eater; the dashed line is remains and waste going to decomposers.",
    pyramid: { title: "Energy pyramid of Grass → Grasshopper → Frog → Snake", unit: "kJ", heat: "lost as heat:", unknown: "? kJ", note: "Illustrative 1/10 convention; bar widths are not to scale." },
    modelLimit: "Simple model: an illustrative web, showing only direct effects on the prey and predators of a lost species. In nature effects spread further and change over time.",
    energyUnit: "Energy (kJ)", invalidNumber: "Enter a number, for example 25 or 2.5.",
    explore: {
      show: "Explore more", hide: "Close explore", title: "Free explore",
      intro: "Tap a species on the board to remove it and see the direct effects. This part is not scored or saved.",
      reset: "Restore the web", links: "Food chains through each species (two or more makes it a common link):",
      chains: (n: number) => `${n} chains`,
    },
  },
});
const t = text();
const chains = foodWebChains();
const chainCount = (id: SpeciesId) => chains.filter((chain) => chain.includes(id)).length;

const isRemoval = (id: FwCheckpointId): id is "HUNT" | "DEFOREST" => id === "HUNT" || id === "DEFOREST";

function effectsMap(observation: any): Partial<Record<SpeciesId, Effect>> | null {
  if (!observation?.effects) return null;
  return Object.fromEntries(Object.entries(observation.effects).map(([id, value]: [string, any]) => [id, value.effect])) as Partial<Record<SpeciesId, Effect>>;
}

export function FoodWebActivity({ state, onChange }: { state: unknown; onChange: (value: FwEvidence) => void }) {
  const evidence = fwEvidenceFrom(state);
  const phase = fwPhaseOf(evidence);
  const step = fwStepNumber(phase);
  const [questionOpen, setQuestionOpen] = useState(true);
  const [roleDraft, setRoleDraft] = useState<Partial<RolesAnswer>>({});
  const [energyDraft, setEnergyDraft] = useState("");
  const [energyError, setEnergyError] = useState(false);
  const [causeDraft, setCauseDraft] = useState<CauseId[]>([]);
  const [explore, setExplore] = useState(false);
  const [exploreRemoved, setExploreRemoved] = useState<SpeciesId | null>(null);
  // After a check the board keeps that result until the learner moves on.
  const [review, setReview] = useState<FwCheckpointId | null>(null);

  const current = phase.kind === "predict" || phase.kind === "act" ? evidence.checkpoints[phase.index] : null;
  const done = phase.kind === "explain" || phase.kind === "ready";
  const exploring = done && explore;
  const lastObserved = [...evidence.checkpoints].reverse().find((checkpoint) => evidence.observed[checkpoint.id]) ?? null;
  // The board shows the step being worked on, or the last observed one.
  const checkpointOf = (id: FwCheckpointId) => evidence.checkpoints.find((c) => c.id === id)!;
  const reviewed = review && evidence.observed[review] ? checkpointOf(review) : null;
  const focus = reviewed ?? current ?? lastObserved ?? evidence.checkpoints[5];
  const chainCheckpoint = evidence.checkpoints[1];
  const chainNodes = (chainCheckpoint.state.nodes as SpeciesId[]) ?? [];

  const rolesComplete = ROLE_ITEMS.every((item) => roleDraft[item]);
  const update = (index: number, patch: Partial<FwEvidence["checkpoints"][number]>, observed?: FwCheckpointId) => {
    const checkpoints = [...evidence.checkpoints] as FwEvidence["checkpoints"];
    checkpoints[index] = { ...checkpoints[index], ...patch };
    onChange({ ...evidence, checkpoints, observed: observed ? { ...evidence.observed, [observed]: true } : evidence.observed });
  };
  const predict = (prediction: FwPrediction) => { if (phase.kind === "predict") { setReview(null); update(phase.index, { prediction }); } };
  const act = () => {
    if (phase.kind !== "act") return;
    setReview(phase.id);
    onChange({ ...evidence, observed: { ...evidence.observed, [phase.id]: true } });
  };
  const pickChain = (id: SpeciesId) => {
    if (phase.kind !== "predict" || phase.id !== "CHAIN" || chainNodes.includes(id) || chainNodes.length >= MAX_CHAIN) return;
    setReview(null);
    update(1, { state: chainState([...chainNodes, id]) });
  };
  const checkChain = () => { setReview("CHAIN"); update(1, { prediction: "CHAIN" }, "CHAIN"); };
  const saveEnergy = () => {
    const value = energyDraft.trim();
    if (!DECIMAL_PATTERN.test(value)) { setEnergyError(true); return; }
    setEnergyError(false);
    predict({ value });
  };

  // Observations from the pinned shared model (advisory preview).
  const observation = (id: FwCheckpointId) => evidence.observed[id] ? previewFw(checkpointOf(id).state) : null;
  const rolesSeen = observation("ROLES");
  const chainSeen = observation("CHAIN");
  const energySeen = observation("ENERGY");
  const removal = exploring ? (exploreRemoved ? previewFw({ setup: "remove", webId: "W1", speciesId: exploreRemoved }) : null)
    : isRemoval(focus.id) ? observation(focus.id) : null;

  const resultText = (id: FwCheckpointId): string | null => {
    const seen = observation(id);
    if (!seen) return null;
    if (id === "ROLES") return t.rolesResult;
    if (id === "CHAIN") {
      if (!seen.valid) return t.chainBroken(t.names[seen.nodes[seen.brokenAt - 1] as SpeciesId], t.names[seen.nodes[seen.brokenAt] as SpeciesId]);
      if (!seen.startsWithProducer) return t.chainNoProducer;
      return seen.length >= 4 ? t.chainValid(seen.length) : t.chainShort(seen.length);
    }
    if (id === "ENERGY") return t.energyResult;
    if (isRemoval(id)) {
      const { removed, asked } = ASKED[id];
      return t.removeResult(t.names[removed], t.names[asked], t.effects[seen.effects[asked].effect as Effect], seen.brokenChains);
    }
    return t.causesResult;
  };
  const shownText = current && evidence.observed[current.id] ? resultText(current.id) : lastObserved ? resultText(lastObserved.id) : null;
  const heading = phase.kind === "predict" ? t.question[phase.id] : phase.kind === "act" ? t.actPrompt[phase.id] : phase.kind === "explain" ? t.explanation : t.ready;
  const showPyramid = !exploring && focus.id === "ENERGY";
  const showCauses = !exploring && focus.id === "CAUSES";
  const causesSeen = observation("CAUSES");

  return <section className="fw-activity" data-testid="fw-activity" aria-label={t.title}>
    <div className="fw-stage" data-testid="fw-stage">
      <div className="fw-stage-inner">
        {showCauses
          ? <ul className="fw-causes" data-testid="fw-causes">
              {CAUSE_IDS.map((id) => {
                const cause = FOOD_WEB_CAUSES[id];
                return <li key={id} data-disturbs={causesSeen ? String(cause.disturbs) : undefined}>
                  <b>{t.causes[id]}</b>
                  <span>{causesSeen ? (cause.disturbs && cause.removes ? t.causeResult(t.names[cause.removes as SpeciesId]) : t.causeProtects) : "?"}</span>
                </li>;
              })}
            </ul>
          : <>
              <div className={showPyramid ? "fw-compact" : undefined}>
                <FoodWebScene names={t.names} roleNames={t.roles} effectNames={t.effects} removedLabel={t.removed}
                  chain={focus.id === "CHAIN" || showPyramid ? chainNodes : []}
                  brokenAt={(focus.id === "CHAIN" || showPyramid) && chainSeen && !chainSeen.valid ? chainSeen.brokenAt : null}
                  removed={removal?.removed ?? null} effects={effectsMap(removal)}
                  roles={rolesSeen ? rolesSeen.roles : null}
                  pickable={(id) => exploring ? id !== "nam-vi-khuan" : phase.kind === "predict" && phase.id === "CHAIN" && !chainNodes.includes(id)}
                  onPick={exploring ? (id) => setExploreRemoved(id) : pickChain}
                  label={t.sceneLabel} illustrative={t.illustrative} />
              </div>
              {showPyramid && <EnergyPyramid names={ENERGY_CHAIN.map((id) => t.names[id])} levelsKJ={energySeen?.levelsKJ ?? null} heatKJ={energySeen?.heatKJ ?? null} labels={t.pyramid} />}
            </>}
      </div>
    </div>

    <div className="fw-dock" role="group" aria-label={t.title}>
      {phase.kind === "predict" && phase.id === "CHAIN" ? <>
        <p className="fw-chain-text" data-testid="fw-chain-text" aria-live="polite">
          <span>{t.chainNow}: </span>{chainNodes.length ? chainNodes.map((id) => t.names[id]).join(" → ") : t.chainEmpty}
        </p>
        <button type="button" className="fw-tool" disabled={!chainNodes.length} onClick={() => update(1, { state: chainState(chainNodes.slice(0, -1)) })}><Undo2 size={16} aria-hidden="true" /><span>{t.undo}</span></button>
        <button type="button" className="fw-tool" disabled={!chainNodes.length} onClick={() => update(1, { state: chainState([]) })}><RotateCcw size={16} aria-hidden="true" /><span>{t.clear}</span></button>
        <button type="button" className="fw-act" data-testid="fw-check-chain" disabled={chainNodes.length < 2} onClick={checkChain}><Play size={16} aria-hidden="true" /><span>{t.action.CHAIN}</span></button>
      </> : <>
      {reviewed && !done && <button type="button" className="fw-tool" data-testid="fw-next" onClick={() => setReview(null)}><ArrowRight size={16} aria-hidden="true" /><span>{t.next}</span></button>}
      <button type="button" className="fw-act" data-testid="fw-act" disabled={phase.kind !== "act"} onClick={act}>
        <Play size={16} aria-hidden="true" /><span>{current ? t.action[current.id] : t.action.CAUSES}</span>
      </button></>}
    </div>

    <button type="button" className="fw-question-badge" aria-expanded={questionOpen} aria-controls="fw-questions" onClick={() => setQuestionOpen((open) => !open)}>
      <CircleHelp size={16} aria-hidden="true" /><span>{t.questions}, {t.step(step).toLowerCase()}</span>
    </button>
    <div id="fw-questions" className="fw-panel" data-open={questionOpen} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setQuestionOpen(false); } }}>
      <div className="fw-panel-header">
        <div>
          <p className="fw-discipline">{t.discipline}</p>
          <p className="fw-step">{t.step(step)}</p>
        </div>
        <button type="button" className="fw-close" aria-label={t.closeQuestions} title={t.closeQuestions} onClick={() => setQuestionOpen(false)}><X size={15} aria-hidden="true" /></button>
      </div>
      <div className="fw-progress" aria-hidden="true">
        {Array.from({ length: FW_STEP_COUNT }, (_, i) => <span key={i} data-state={i + 1 < step ? "done" : i + 1 === step ? "current" : "todo"} />)}
      </div>
      <h3 className="fw-heading" aria-live="polite">{heading}</h3>

      {phase.kind === "predict" && phase.id === "ROLES" && <form className="fw-form" data-testid="fw-answer-roles" onSubmit={(event) => { event.preventDefault(); if (rolesComplete) predict(roleDraft as RolesAnswer); }}>
        {ROLE_ITEMS.map((item) => <fieldset key={item} className="fw-segment">
          <legend>{t.names[item]}</legend>
          {ROLES.map((role) => <label key={role} className="fw-segment-option">
            <input type="radio" name={`fw-role-${item}`} checked={roleDraft[item] === role} onChange={() => setRoleDraft({ ...roleDraft, [item]: role })} />
            <span>{t.roles[role]}</span>
          </label>)}
        </fieldset>)}
        <button type="submit" className="fw-tool" disabled={!rolesComplete}>{t.save}</button>
      </form>}

      {phase.kind === "predict" && phase.id === "ENERGY" && <form className="fw-form fw-energy" data-testid="fw-answer-energy" onSubmit={(event) => { event.preventDefault(); saveEnergy(); }}>
        <label className="fw-field-label">
          <span>{t.energyUnit}</span>
          <input type="text" inputMode="decimal" autoComplete="off" value={energyDraft} aria-invalid={energyError} aria-describedby={energyError ? "fw-energy-error" : undefined}
            onChange={(event) => { setEnergyDraft(event.target.value); setEnergyError(false); }} />
        </label>
        {energyError && <p id="fw-energy-error" className="fw-error" role="alert">{t.invalidNumber}</p>}
        <button type="submit" className="fw-tool">{t.save}</button>
      </form>}

      {phase.kind === "predict" && isRemoval(phase.id) && <fieldset className="fw-choices" data-testid={`fw-answer-${phase.id.toLowerCase()}`}>
        <legend>{t.answerLegend}</legend>
        {EFFECTS.map((effect) => <label key={effect} className="fw-choice">
          <input type="radio" name={`fw-answer-${phase.id}`} value={effect} checked={current?.prediction === effect} onChange={() => predict(effect)} />
          <span>{t.effects[effect]}</span>
        </label>)}
      </fieldset>}

      {phase.kind === "predict" && phase.id === "CAUSES" && <form className="fw-form" data-testid="fw-answer-causes" onSubmit={(event) => { event.preventDefault(); predict([...causeDraft].sort()); }}>
        <fieldset className="fw-choices">
          <legend>{t.answerLegend}</legend>
          {CAUSE_IDS.map((id) => <label key={id} className="fw-choice">
            <input type="checkbox" checked={causeDraft.includes(id)} onChange={() => setCauseDraft(causeDraft.includes(id) ? causeDraft.filter((c) => c !== id) : [...causeDraft, id])} />
            <span>{t.causes[id]}</span>
          </label>)}
        </fieldset>
        <button type="submit" className="fw-tool">{t.save}</button>
      </form>}

      <div className="fw-observation" role="status" aria-live="polite" data-testid="fw-observation">
        {shownText ? <p><Check size={15} aria-hidden="true" /> {shownText}</p> : <p className="fw-hint"><Info size={15} aria-hidden="true" /> {t.hint}</p>}
      </div>

      {done && <fieldset className="fw-choices" data-testid="fw-explanation">
        <legend>{t.explanation}</legend>
        {(["A", "B", "C"] as const).map((answer) => <label key={answer} className="fw-choice">
          <input type="radio" name="fw-explanation" value={answer} checked={evidence.explanation === answer} onChange={() => onChange({ ...evidence, explanation: answer })} />
          <span className="fw-letter">{answer}</span>
          <span>{t[answer.toLowerCase() as "a" | "b" | "c"]}</span>
        </label>)}
      </fieldset>}
      {phase.kind === "ready" && <p className="fw-ready" role="status"><Check size={16} aria-hidden="true" /> {t.ready}</p>}

      {done && <div className="fw-explore" data-testid="fw-explore">
        <button type="button" className="fw-tool" aria-expanded={exploring} aria-controls="fw-explore-controls" onClick={() => { setExplore((value) => !value); setExploreRemoved(null); }}>
          <Compass size={16} aria-hidden="true" /><span>{exploring ? t.explore.hide : t.explore.show}</span>
        </button>
        {exploring && <div id="fw-explore-controls" className="fw-explore-controls">
          <h4 className="fw-explore-title">{t.explore.title}</h4>
          <p className="fw-note">{t.explore.intro}</p>
          {exploreRemoved && removal && <p className="fw-note" role="status">{t.names[exploreRemoved]} {t.removed}. {Object.entries(removal.effects).filter(([, v]: any) => v.effect !== "NO_DIRECT_EFFECT").map(([id, v]: any) => `${t.names[id as SpeciesId]}: ${t.effects[v.effect as Effect].toLowerCase()}`).join("; ")}.</p>}
          <button type="button" className="fw-tool" disabled={!exploreRemoved} onClick={() => setExploreRemoved(null)}><RotateCcw size={16} aria-hidden="true" /><span>{t.explore.reset}</span></button>
          <p className="fw-note">{t.explore.links}</p>
          <ul className="fw-links">
            {(Object.keys(t.names) as SpeciesId[]).filter((id) => id !== "nam-vi-khuan").map((id) => <li key={id}>{t.names[id]}: {t.explore.chains(chainCount(id))}</li>)}
          </ul>
        </div>}
      </div>}
      <p className="fw-note">{t.modelLimit}</p>
    </div>
  </section>;
}
