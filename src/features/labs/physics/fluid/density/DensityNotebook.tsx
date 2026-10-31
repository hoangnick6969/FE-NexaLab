import { getLocale } from "../../../../../i18n";
import { densityText } from "./density-copy";
import {
  DENSITY_UNITS, boxVolumeCm3, densityIssues, newTrial, stationDone, tentative,
  type Choice, type DensityEntry, type DensityEvidence, type Num, type StationId,
} from "./density-evidence";
import { NumberField } from "./NumberField";

const fmt = (value: Num, places = 3) => value === null ? "–" : Number(value.toFixed(places)).toString().replace(".", getLocale() === "vi" ? "," : ".");

function Choices({ name, legend, options, value, onChange }: { name: string; legend: string; options: Record<"A" | "B" | "C", string>; value: Choice; onChange: (choice: "A" | "B" | "C") => void }) {
  return <fieldset className="fl03-choices">
    <legend>{legend}</legend>
    {(["A", "B", "C"] as const).map((key) => <label key={key} className="fl03-choice">
      <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
      <span className="fl03-choice-letter" aria-hidden="true">{key}</span>
      <span>{options[key]}</span>
    </label>)}
  </fieldset>;
}

function DensityEntryFields({ entry, onChange, testId }: { entry: DensityEntry; onChange: (entry: DensityEntry) => void; testId: string }) {
  const t = densityText();
  return <div className="fl03-density-entry" role="group" aria-label={t.density}>
    <NumberField label={`${t.density}: ${t.densityValue}`} value={entry.value} onChange={(value) => onChange({ ...entry, value })} testId={`${testId}-value`} />
    <label className="fl03-field">
      <span className="fl03-field-label">{t.densityUnit}</span>
      <select value={entry.unit} onChange={(event) => onChange({ ...entry, unit: event.target.value as DensityEntry["unit"] })} data-testid={`${testId}-unit`}>
        {DENSITY_UNITS.map((unit) => <option key={unit} value={unit}>{t.unitLabels[unit]}</option>)}
      </select>
    </label>
  </div>;
}

const Row = ({ label, value, note }: { label: string; value: string; note?: boolean }) => <p className="fl03-derived"><span>{label}</span><b>{value}</b>{note && <small>{densityText().tentative}</small>}</p>;

/**
 * The learner's data tables, laid out like the textbook's Bảng 13.1–14.3. Values
 * labelled "tạm tính" are intermediate arithmetic shown on this device only;
 * the division that gives the density is the learner's own work.
 */
export function DensityNotebook({ station, evidence, onChange }: { station: StationId; evidence: DensityEvidence; onChange: (next: DensityEvidence) => void }) {
  const t = densityText();
  const issues = densityIssues(evidence);
  const setMass = (id: string, massG: Num) => onChange({ ...evidence, explore: { ...evidence.explore, masses: evidence.explore.masses.map((item) => item.specimenId === id ? { ...item, massG } : item) } });
  const massOf = (id: string) => evidence.explore.masses.find((item) => item.specimenId === id)!.massG;

  if (station === "explore") {
    const rows = (ids: readonly string[], mirror?: string) => ids.map((id) => {
      const volume = boxVolumeCm3(id);
      const mass = massOf(id);
      return <tr key={`${id}${mirror ?? ""}`}>
        <th scope="row">{t.bars[id as keyof typeof t.bars]}</th>
        <td>{fmt(volume)}</td>
        <td>{id === mirror ? <span title={t.sameAsAbove}>{fmt(mass)}</span> : <NumberField hideLabel label={`${t.mass}: ${t.bars[id as keyof typeof t.bars]}`} value={mass} onChange={(value) => setMass(id, value)} testId={`explore-mass-${id}`} />}</td>
        <td>{mass && mass > 0 ? fmt(mass / volume) : "–"}</td>
      </tr>;
    });
    const head = <thead><tr><th scope="col">{t.bar}</th><th scope="col">{t.volume}</th><th scope="col">{t.mass}</th><th scope="col">{t.ratio}</th></tr></thead>;
    return <div className="fl03-notebook" data-testid="density-notebook-explore">
      <table className="fl03-table"><caption>{t.table131}</caption>{head}<tbody>{rows(["iron-1v", "iron-2v", "iron-3v"])}</tbody></table>
      <table className="fl03-table"><caption>{t.table132}</caption>{head}<tbody>{rows(["iron-1v"], "iron-1v")}{rows(["aluminium-1v", "copper-1v"])}</tbody></table>
      <p className="fl03-tentative">{t.tentative}</p>
      <Choices name="explore-conclusion" legend={t.explorePrompt} options={t.conclusionOptions} value={evidence.explore.conclusion} onChange={(conclusion) => onChange({ ...evidence, explore: { ...evidence.explore, conclusion } })} />
    </div>;
  }

  if (station === "block") {
    const { trials } = evidence.block;
    const volumes = tentative.blockVolumes(trials);
    const setTrial = (index: number, change: Partial<(typeof trials)[number]>) => onChange({ ...evidence, block: { ...evidence.block, trials: trials.map((trial, i) => i === index ? { ...trial, ...change } : trial) } });
    return <div className="fl03-notebook" data-testid="density-notebook-block">
      <h3 className="fl03-notebook-title">{t.table141}</h3>
      {trials.map((trial, index) => <fieldset key={index} className="fl03-trial">
        <legend>{t.trial(index + 1)}</legend>
        <NumberField label={t.edgeLen("a")} value={trial.aMm} onChange={(aMm) => setTrial(index, { aMm })} testId={`block-${index}-a`} />
        <NumberField label={t.edgeLen("b")} value={trial.bMm} onChange={(bMm) => setTrial(index, { bMm })} testId={`block-${index}-b`} />
        <NumberField label={t.edgeLen("c")} value={trial.cMm} onChange={(cMm) => setTrial(index, { cMm })} testId={`block-${index}-c`} />
        <NumberField label={t.mass} value={trial.massG} onChange={(massG) => setTrial(index, { massG })} testId={`block-${index}-mass`} />
        <Row label={t.volume} value={fmt(volumes[index])} note />
      </fieldset>)}
      <div className="fl03-inline-actions">
        {trials.length < 3 && <button type="button" className="secondary" onClick={() => onChange({ ...evidence, block: { ...evidence.block, trials: [...trials, newTrial()] } })}>{t.addTrial}</button>}
        {trials.length > 1 && <button type="button" className="secondary" onClick={() => onChange({ ...evidence, block: { ...evidence.block, trials: trials.slice(0, -1) } })}>{t.removeTrial}</button>}
      </div>
      {trials.length > 1 && <>
        <Row label={t.meanVolume} value={fmt(tentative.mean(volumes))} note />
        <Row label={t.meanMass} value={fmt(tentative.mean(trials.map((trial) => trial.massG)))} note />
      </>}
      <DensityEntryFields entry={evidence.block.density} onChange={(density) => onChange({ ...evidence, block: { ...evidence.block, density } })} testId="block-density" />
    </div>;
  }

  if (station === "water") {
    const { water } = evidence;
    const waterMass = water.m1G !== null && water.m2G !== null ? water.m2G - water.m1G : null;
    return <div className="fl03-notebook" data-testid="density-notebook-water">
      <h3 className="fl03-notebook-title">{t.table142}</h3>
      <NumberField label={t.waterVolume} value={water.volumeMl} onChange={(volumeMl) => onChange({ ...evidence, water: { ...water, volumeMl } })} testId="water-volume" />
      <NumberField label={t.cupEmpty} value={water.m1G} onChange={(m1G) => onChange({ ...evidence, water: { ...water, m1G } })} testId="water-m1" />
      <NumberField label={t.cupWater} value={water.m2G} onChange={(m2G) => onChange({ ...evidence, water: { ...water, m2G } })} testId="water-m2" />
      <Row label={t.waterMass} value={fmt(waterMass, 2)} note />
      <DensityEntryFields entry={water.density} onChange={(density) => onChange({ ...evidence, water: { ...water, density } })} testId="water-density" />
    </div>;
  }

  if (station === "pebble") {
    const { pebble } = evidence;
    const displaced = pebble.v1Ml !== null && pebble.v2Ml !== null ? pebble.v2Ml - pebble.v1Ml : null;
    return <div className="fl03-notebook" data-testid="density-notebook-pebble">
      <h3 className="fl03-notebook-title">{t.table143}</h3>
      <NumberField label={t.pebbleMass} value={pebble.massG} onChange={(massG) => onChange({ ...evidence, pebble: { ...pebble, massG } })} testId="pebble-mass" />
      <NumberField label={t.level1} value={pebble.v1Ml} onChange={(v1Ml) => onChange({ ...evidence, pebble: { ...pebble, v1Ml } })} testId="pebble-v1" />
      <NumberField label={t.level2} value={pebble.v2Ml} onChange={(v2Ml) => onChange({ ...evidence, pebble: { ...pebble, v2Ml } })} testId="pebble-v2" />
      <Row label={t.displaced} value={fmt(displaced, 2)} note />
      <DensityEntryFields entry={pebble.density} onChange={(density) => onChange({ ...evidence, pebble: { ...pebble, density } })} testId="pebble-density" />
    </div>;
  }

  const todo = (Object.keys(issues) as StationId[]).filter((id) => id !== "conclusion" || issues.conclusion.length > 0).filter((id) => !stationDone(evidence, id));
  return <div className="fl03-notebook" data-testid="density-notebook-conclusion">
    <h3 className="fl03-notebook-title">{t.convert}</h3>
    <NumberField label={t.woodKgm3} value={evidence.units.woodKgm3} unit="kg/m³" onChange={(woodKgm3) => onChange({ ...evidence, units: { ...evidence.units, woodKgm3 } })} testId="units-wood" />
    <Choices name="irregular-reason" legend={t.irregularPrompt} options={t.irregularOptions} value={evidence.units.irregularReason} onChange={(irregularReason) => onChange({ ...evidence, units: { ...evidence.units, irregularReason } })} />
    <section className="fl03-ready" aria-label={t.readyTitle} data-testid="density-ready">
      <h3 className="fl03-notebook-title">{t.readyTitle}</h3>
      {todo.length === 0 ? <p className="fl03-ready-ok" role="status">{t.allDone}</p> : <ul>
        {todo.map((id) => <li key={id}><b>{t.stations[id]}</b> <span>{t.stationTodo}: {issues[id].map((issue) => t.issueLabels[issue as keyof typeof t.issueLabels]).join(", ")}</span></li>)}
      </ul>}
    </section>
  </div>;
}

