/**
 * Explore journal for every Explore bench (FL-26, FL-20, FL-21, FL-27, FL-16): each saved line is one state the
 * student chose plus an optional note. Stored per Lab and pinned activity through the shared observation-log store;
 * exported as JSON with `scored: false`, like the other Explore logs.
 */
import { useEffect, useState } from "react";
import { buildObservationLogExport, createObservationLogStore, observationLogKey } from "./observation-log";

export type ExploreJournalEntry = { at: string; summary: string; note: string };

/** One shared IndexedDB for every Explore bench; keys already separate Labs and pinned versions. */
export const exploreJournalStore = createObservationLogStore<ExploreJournalEntry>("nexalab-explore-journal");

/** Pure: the next journal list with one line added at the end. */
export function appendJournalEntry(entries: readonly ExploreJournalEntry[], entry: ExploreJournalEntry): ExploreJournalEntry[] {
  return [...entries, { at: entry.at, summary: entry.summary.trim(), note: entry.note.trim() }];
}

/** Pure: the JSON payload written when the student exports the journal. */
export function journalExportPayload(meta: { labId: string; activityId: string; kit: string; engine: string }, entries: readonly ExploreJournalEntry[]) {
  return buildObservationLogExport(meta, entries);
}

export function ExploreJournal({ labId, activityId, kit, engine, summary, canSave }: {
  labId: string; activityId: string; kit: string; engine: string;
  /** What the bench shows right now, written as the journal line on save. */
  summary: string;
  canSave: boolean;
}) {
  const logKey = observationLogKey(labId, activityId);
  const [entries, setEntries] = useState<ExploreJournalEntry[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => { void exploreJournalStore.load(logKey).then(setEntries); }, [logKey]);

  async function save() {
    const next = appendJournalEntry(entries, { at: new Date().toISOString(), summary, note });
    setEntries(next);
    setNote("");
    await exploreJournalStore.save(logKey, next);
  }

  function exportJournal() {
    const payload = journalExportPayload({ labId, activityId, kit, engine }, entries);
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${labId}-nhat-ky.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel" data-testid="explore-journal">
      <h2>Nhật ký</h2>
      <label>Ghi chú quan sát<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} /></label>
      <button type="button" onClick={save} disabled={!canSave}>Lưu trạng thái này vào nhật ký</button>{" "}
      <button type="button" className="secondary" onClick={exportJournal} disabled={!entries.length}>Xuất nhật ký (JSON)</button>
      <ol>
        {entries.map((entry) => <li key={entry.at}><b>{entry.summary}</b>{entry.note ? ` — ${entry.note}` : ""}</li>)}
      </ol>
    </section>
  );
}
