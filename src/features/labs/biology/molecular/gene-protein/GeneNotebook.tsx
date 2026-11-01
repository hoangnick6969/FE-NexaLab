import { useEffect, useId, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { getLocale } from "../../../../../i18n";
import { CODON_MEANINGS, CodonTable, type CodonMeaning } from "../kit";
import { fl27Table } from "./fl27-gene.config";
import { geneText } from "./gene-copy";
import { EFFECTS, STAGES, STATION_IDS, stationDone, type Choice, type GeneEvidence, type Stage, type StationId } from "./gene-evidence";

type Patch = (change: (evidence: GeneEvidence) => GeneEvidence) => void;

const format = (value: number | null) => (value === null ? "" : String(value).replace(".", getLocale() === "vi" ? "," : "."));

/** Decimal input that accepts "3,4" and "3.4"; the draft keeps null until the text is a number. */
function NumberRow({ label, value, onChange, testId }: { label: string; value: number | null; onChange: (value: number | null) => void; testId: string }) {
  const t = geneText();
  const id = useId();
  const [text, setText] = useState(format(value));
  useEffect(() => { setText((current) => (Number(current.replace(",", ".")) === value ? current : format(value))); }, [value]);
  const parsed = text.trim() === "" ? null : Number(text.trim().replace(",", "."));
  const invalid = text.trim() !== "" && (!Number.isFinite(parsed) || (parsed ?? 0) < 0);
  return <div className="k7-field">
    <div className="k7-field-row">
      <label htmlFor={id}>{label}</label>
      <input id={id} inputMode="decimal" value={text} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} data-testid={testId}
        onChange={(event) => {
          setText(event.target.value);
          const next = event.target.value.trim() === "" ? null : Number(event.target.value.trim().replace(",", "."));
          onChange(next !== null && Number.isFinite(next) && next >= 0 ? next : null);
        }} />
    </div>
    {invalid && <p id={`${id}-error`} className="k7-error">{t.invalidNumber}</p>}
  </div>;
}

function Choices<T extends string>({ legend, options, value, onChange, name }: { legend: string; options: Record<T, string>; value: T | null; onChange: (value: T) => void; name: string }) {
  return <fieldset className="k7-choices">
    <legend>{legend}</legend>
    {(Object.keys(options) as T[]).map((key) => <label key={key} className="k7-choice">
      <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
      <span>{options[key]}</span>
    </label>)}
  </fieldset>;
}

function AminoSelect({ label, value, onChange, testId }: { label: string; value: CodonMeaning | null; onChange: (value: CodonMeaning | null) => void; testId: string }) {
  const t = geneText();
  const id = useId();
  return <div className="k7-field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value ?? ""} onChange={(event) => onChange((event.target.value || null) as CodonMeaning | null)} data-testid={testId}>
      <option value="">{t.notChosen}</option>
      {CODON_MEANINGS.map((meaning) => <option key={meaning} value={meaning}>{meaning === "Stop" ? t.stop : meaning}</option>)}
    </select>
  </div>;
}

/**
 * Per-station answers for FL-27. Choices mirror the textbook questions; the
 * notebook only records them, and the server marks the submission.
 */
export function GeneNotebook({ station, evidence, patch, codonInFocus }: { station: StationId; evidence: GeneEvidence; patch: Patch; codonInFocus: string | null }) {
  const t = geneText();
  const done = stationDone(evidence, station);
  const status = <p className="k7-status">{done ? <CircleCheck size={15} aria-hidden="true" /> : <CircleAlert size={15} aria-hidden="true" />}<span>{done ? t.stationDone : t.missing(t.stations[station])}</span></p>;

  if (station === "structure") {
    const set = (key: keyof Omit<GeneEvidence["structure"], "pairing">) => (value: number | null) => patch((current) => ({ ...current, structure: { ...current.structure, [key]: value } }));
    return <section className="k7-notebook" aria-label={t.notebook}>
      <h3>{t.notebook}</h3>
      <NumberRow label={t.bpPerTurn} value={evidence.structure.bpPerTurn} onChange={set("bpPerTurn")} testId="gene-bp-per-turn" />
      <NumberRow label={t.turnLength} value={evidence.structure.turnLengthA} onChange={set("turnLengthA")} testId="gene-turn-length" />
      <NumberRow label={t.rise} value={evidence.structure.riseA} onChange={set("riseA")} testId="gene-rise" />
      <NumberRow label={t.diameter} value={evidence.structure.diameterA} onChange={set("diameterA")} testId="gene-diameter" />
      <Choices name="gene-pairing" legend={t.pairingPrompt} options={t.pairingOptions} value={evidence.structure.pairing} onChange={(pairing: Choice) => patch((current) => ({ ...current, structure: { ...current.structure, pairing } }))} />
      {status}
    </section>;
  }

  if (station === "replication") {
    const order = evidence.replication.stageOrder;
    return <section className="k7-notebook" aria-label={t.notebook}>
      <h3>{t.stageOrderPrompt}</h3>
      {order.map((stage, slot) => <label key={slot} className="k7-field">
        <span>{t.stageSlot(slot + 1)}</span>
        <select value={stage ?? ""} data-testid={`gene-stage-${slot + 1}`} onChange={(event) => {
          const next = [...order] as (Stage | null)[];
          next[slot] = (event.target.value || null) as Stage | null;
          patch((current) => ({ ...current, replication: { ...current.replication, stageOrder: next } }));
        }}>
          <option value="">{t.chooseStage}</option>
          {STAGES.map((option) => <option key={option} value={option}>{t.stages[option]}</option>)}
        </select>
      </label>)}
      <Choices name="gene-semi" legend={t.semiPrompt} options={t.semiOptions} value={evidence.replication.semiConservative} onChange={(semiConservative: Choice) => patch((current) => ({ ...current, replication: { ...current.replication, semiConservative } }))} />
      {status}
    </section>;
  }

  if (station === "transcription") return <section className="k7-notebook" aria-label={t.notebook}>{status}</section>;

  if (station === "translation") {
    const combos = evidence.translation.codonCombos;
    const set = (key: keyof typeof combos) => (value: number | null) => patch((current) => ({ ...current, translation: { ...current.translation, codonCombos: { ...current.translation.codonCombos, [key]: value } } }));
    return <section className="k7-notebook" aria-label={t.notebook}>
      <CodonTable table={fl27Table} highlight={codonInFocus} />
      <h3>{t.combosPrompt}</h3>
      <NumberRow label={t.comboN(1)} value={combos.n1} onChange={set("n1")} testId="gene-combo-1" />
      <NumberRow label={t.comboN(2)} value={combos.n2} onChange={set("n2")} testId="gene-combo-2" />
      <NumberRow label={t.comboN(3)} value={combos.n3} onChange={set("n3")} testId="gene-combo-3" />
      {status}
    </section>;
  }

  if (station === "mutation") {
    const codon = evidence.mutation.mutatedCodon;
    const codonInvalid = codon.length > 0 && !/^[AUGC]{0,3}$/.test(codon);
    return <section className="k7-notebook" aria-label={t.notebook}>
      <CodonTable table={fl27Table} highlight={/^[AUGC]{3}$/.test(codon) ? codon : null} />
      <label className="k7-field">
        <span>{t.codonPrompt}</span>
        <input value={codon} maxLength={3} autoCapitalize="characters" spellCheck={false} aria-invalid={codonInvalid} data-testid="gene-mutated-codon"
          onChange={(event) => { const next = event.target.value.toUpperCase().replace(/\s/g, "").slice(0, 3); patch((current) => ({ ...current, mutation: { ...current.mutation, mutatedCodon: next } })); }} />
      </label>
      {codonInvalid && <p className="k7-error">{t.codonInvalid}</p>}
      <AminoSelect label={t.mutatedAmino} value={evidence.mutation.mutatedAminoAcid} testId="gene-mutated-amino" onChange={(mutatedAminoAcid) => patch((current) => ({ ...current, mutation: { ...current.mutation, mutatedAminoAcid } }))} />
      <Choices name="gene-effect" legend={t.effectPrompt} options={t.effects} value={evidence.mutation.effect} onChange={(effect: (typeof EFFECTS)[number]) => patch((current) => ({ ...current, mutation: { ...current.mutation, effect } }))} />
      {status}
    </section>;
  }

  const missing = STATION_IDS.filter((id) => !stationDone(evidence, id)).map((id) => t.stations[id]);
  return <section className="k7-notebook" aria-label={t.notebook}>
    <Choices name="gene-flow" legend={t.flowPrompt} options={t.flowOptions} value={evidence.conclusion.flow} onChange={(flow: Choice) => patch((current) => ({ ...current, conclusion: { ...current.conclusion, flow } }))} />
    <Choices name="gene-role" legend={t.rolePrompt} options={t.roleOptions} value={evidence.conclusion.geneRole} onChange={(geneRole: Choice) => patch((current) => ({ ...current, conclusion: { ...current.conclusion, geneRole } }))} />
    <h3>{t.readyTitle}</h3>
    <p className="k7-status" data-testid="gene-readiness">{missing.length ? <CircleAlert size={15} aria-hidden="true" /> : <CircleCheck size={15} aria-hidden="true" />}<span>{missing.length ? t.missing(missing.join(", ")) : t.allDone}</span></p>
  </section>;
}
