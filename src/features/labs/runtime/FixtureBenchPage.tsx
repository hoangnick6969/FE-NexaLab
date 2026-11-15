/** Page of the dev-only fixture bench (F0-2): shows the configured items read through `listKitItems`. */
import { LabSpace } from "../shared/LabSpace";
import type { ExplorePageProps } from "./explore-registry";
import { listFixtureKitItems, type FixtureConfig } from "./fixture-bench";

export default function FixtureBenchPage({ title, config, activity }: ExplorePageProps) {
  const items = listFixtureKitItems(config as FixtureConfig);
  return <LabSpace title={title} exitTo="/labs">
    <section className="panel" data-testid="fixture-bench" data-activity={activity.id}>
      <h2>Dụng cụ và thành phần</h2>
      <ul>{items.map((entry) => <li key={entry.id}><b>{entry.labelVi}</b> · {entry.purposeVi}</li>)}</ul>
    </section>
  </LabSpace>;
}
