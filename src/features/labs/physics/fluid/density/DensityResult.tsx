import { Check, X } from "lucide-react";
import { getLocale } from "../../../../../i18n";
import { densityText } from "./density-copy";

const CRITERIA = ["balance", "ruler", "cylinder", "calculation", "unitConversion", "concept"] as const;

/** Server feedback for rubric `density-stations@1`; it renders the stored result and computes nothing. */
export function DensityResult({ result, verdict }: { result: any; verdict: string }) {
  const t = densityText();
  const assessment = result?.assessment;
  const unmet: string[] = Array.isArray(assessment?.unmetCriteria) ? assessment.unmetCriteria : [];
  const decimal = (value: number) => String(value).replace(".", getLocale() === "vi" ? "," : ".");
  return <div className="fl03-result" data-testid="density-result">
    <p className="bulb-result-message">{verdict === "passed" ? t.passed : t.needsPractice}</p>
    <p className="bulb-result-score">{assessment?.score} / {assessment?.maximumScore}<small>{t.assessment}</small></p>
    <ul className="fl03-criteria">
      {CRITERIA.map((criterion) => {
        const stations = unmet
          .filter((item) => item.startsWith(`${criterion}:`))
          .map((item) => t.criteriaStations[item.split(":")[1] as keyof typeof t.criteriaStations]);
        const ok = stations.length === 0;
        return <li key={criterion} data-met={ok}>
          {ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          <span><b>{t.criteria[criterion]}</b>: {ok ? t.met : `${t.notMet}, ${t.needsReview.toLowerCase()}: ${stations.join(", ")}`}</span>
        </li>;
      })}
    </ul>
    {result?.observations && <>
      <h4 className="fl03-notebook-title">{t.vsReference}</h4>
      <ul className="fl03-criteria">
        {(["block", "water", "pebble"] as const).map((key) => {
          const item = result.observations[key];
          if (!item) return null;
          return <li key={key}><span>{t.densityOf[key]}: {decimal(item.ownDensityGcm3)} g/cm³, {item.withinReferenceBand ? t.withinBand : t.outsideBand}</span></li>;
        })}
      </ul>
    </>}
  </div>;
}

export const densityCopy = () => {
  const t = densityText();
  return { submit: t.submit, waiting: t.waiting, resultTitle: t.resultTitle, assessment: t.assessment };
};
