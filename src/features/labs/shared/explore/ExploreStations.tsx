/**
 * Station picker of a Sinh học Explore bench: the open tools the Guided mode does not have (studio, free settings,
 * own data table, chain builder…). Each station is one way to play with the same released model; nothing is scored.
 */
export type ExploreStation<T extends string> = { id: T; label: string; hint: string };

export function ExploreStations<T extends string>({ stations, value, onChange }: { stations: ReadonlyArray<ExploreStation<T>>; value: T; onChange: (next: T) => void }) {
  const current = stations.find((item) => item.id === value);
  return <fieldset className="explore-stations" data-testid="explore-stations">
    <legend>Trạm khám phá</legend>
    <div className="explore-stations-row" role="group">
      {stations.map((station) => <button type="button" key={station.id} className="explore-chip" aria-pressed={station.id === value} onClick={() => onChange(station.id)}>{station.label}</button>)}
    </div>
    {current && <p className="explore-field-hint">{current.hint}</p>}
  </fieldset>;
}
