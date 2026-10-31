import { getLocale } from "../../../../../i18n";
import { Balance2D, CupGlyph, Cylinder2D, Ruler2D, Specimen2D, k3Material, k3Specimen } from "../kit";
import { fl03DensityConfig as config } from "./fl03-density.config";
import { densityText } from "./density-copy";
import { EXPLORE_IDS, type DensityEvidence, type ExploreId, type StationId } from "./density-evidence";

/** Apparatus set-up the learner manipulates; local presentation state, never evidence. */
export type Bench = { onPan: boolean; edge: "a" | "b" | "c"; transferred: boolean; dropped: boolean; exploreId: ExploreId };
export const initialBench = (): Bench => ({ onPan: false, edge: "a", transferred: false, dropped: false, exploreId: "iron-1v" });

const WATER = config.materials.find((material) => material.kind === "liquid")!;

/** The specimen a station is working with. */
export function stationSpecimenId(station: StationId, evidence: DensityEvidence, bench: Bench) {
  if (station === "block") return evidence.block.specimenId;
  if (station === "pebble") return evidence.pebble.specimenId;
  return bench.exploreId;
}

/** What the balance shows for the current set-up (instrument presentation of configured masses). */
export function balanceReadingG(station: StationId, evidence: DensityEvidence, bench: Bench) {
  if (!bench.onPan) return 0;
  if (station === "water") return Number((config.instruments.beaker.emptyMassG + (bench.transferred ? evidence.water.pouredMl * WATER.referenceDensityGcm3 : 0)).toFixed(1));
  if (station === "pebble" && bench.dropped) return 0;
  return k3Specimen(config, stationSpecimenId(station, evidence, bench)).massG;
}

export function cylinderVolumeMl(station: StationId, evidence: DensityEvidence, bench: Bench) {
  if (station === "water") return bench.transferred ? 0 : evidence.water.pouredMl;
  if (station === "pebble") {
    const pebble = k3Specimen(config, evidence.pebble.specimenId);
    return evidence.pebble.initialMl + (bench.dropped && pebble.shape === "irregular" ? pebble.volumeMl : 0);
  }
  return 0;
}

function Figure({ caption, children, wide = false }: { caption: string; children: React.ReactNode; wide?: boolean }) {
  return <figure className={`fl03-figure${wide ? " is-wide" : ""}`}>{children}<figcaption>{caption}</figcaption></figure>;
}

/**
 * 2D bench for FL-03: balance, ruler and graduated cylinder drawn from the same
 * K3 geometry as the 3D view. It shows set-up and instrument faces; every
 * reading the learner enters is checked on the server.
 */
export function Density2DStage({ station, evidence, bench }: { station: StationId; evidence: DensityEvidence; bench: Bench }) {
  const t = densityText();
  const locale = getLocale();
  const { balance, cylinder, beaker } = config.instruments;
  const specimenId = stationSpecimenId(station, evidence, bench);
  const specimen = k3Specimen(config, specimenId);
  const material = k3Material(config, specimen.materialId);
  const reading = balanceReadingG(station, evidence, bench);
  const cylinderMl = cylinderVolumeMl(station, evidence, bench);
  const onPanLoad = station === "water"
    ? bench.onPan ? <CupGlyph waterMl={bench.transferred ? evidence.water.pouredMl : 0} capacityMl={beaker.capacityMl} /> : null
    : bench.onPan && !(station === "pebble" && bench.dropped) ? <Specimen2D specimen={specimen} material={material} /> : null;
  const balanceFigure = <Figure caption={t.balance}><Balance2D instrument={balance} readingG={reading} label={t.balance} locale={locale} load={onPanLoad} /></Figure>;
  const cylinderFigures = <>
    <Figure caption={t.cylinder}><Cylinder2D cylinder={cylinder} volumeMl={cylinderMl} label={`${t.cylinder}: ${cylinderMl} mL`} /></Figure>
    <Figure caption={t.cylinderZoom}><Cylinder2D cylinder={cylinder} volumeMl={cylinderMl} label={t.cylinderZoom} zoom /></Figure>
  </>;

  let content: React.ReactNode;
  if (station === "block" && specimen.shape === "box") {
    const edgeIndex = { a: 0, b: 1, c: 2 }[bench.edge];
    content = <>
      <Figure caption={t.ruler} wide><Ruler2D edgeMm={specimen.sizeMm[edgeIndex]} edgeLabel={bench.edge} color={material.appearance.color} label={`${t.ruler}: ${bench.edge}`} /></Figure>
      {balanceFigure}
    </>;
  } else if (station === "water") {
    content = <>
      {cylinderFigures}
      {balanceFigure}
      {!bench.onPan && <Figure caption={t.cup}><svg className="k3-2d fl03-cup" viewBox="-40 -80 80 90" role="img" aria-label={t.cup}><CupGlyph waterMl={bench.transferred ? evidence.water.pouredMl : 0} capacityMl={beaker.capacityMl} /></svg></Figure>}
    </>;
  } else if (station === "pebble") {
    content = <>{cylinderFigures}{balanceFigure}</>;
  } else {
    content = <>
      {balanceFigure}
      <Figure caption={t.specimen}>
        <svg className="k3-2d" viewBox="0 0 330 90" role="img" aria-label={t.specimen}>
          {EXPLORE_IDS.map((id, index) => {
            const item = k3Specimen(config, id);
            return <g key={id} transform={`translate(${34 + index * 66} 80)`} opacity={bench.onPan && id === bench.exploreId ? 0.18 : 1}>
              <Specimen2D specimen={item} material={k3Material(config, item.materialId)} fit={48} />
              {id === bench.exploreId && <rect x="-26" y="-62" width="52" height="66" rx="4" fill="none" stroke="var(--k3-selected)" strokeWidth="2" strokeDasharray="4 3" />}
            </g>;
          })}
        </svg>
      </Figure>
    </>;
  }
  return <div className="fl03-stage" data-testid="density-2d-stage" data-station={station}>{content}</div>;
}
