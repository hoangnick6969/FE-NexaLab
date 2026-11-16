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

export function ExploreJournal({ labId, activityId, kit, engine, summary, canSave, saveHint }: {
  labId: string; activityId: string; kit: string; engine: string;
  /** Shown while saving is not possible yet (what the student still has to do on the bench). */
  saveHint?: string;
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
    <section className="explore-card explore-journal" data-testid="explore-journal" aria-labelledby="explore-journal-title">
      <h2 id="explore-journal-title">Nhật ký thí nghiệm</h2>
      <p className="explore-journal-summary" data-testid="explore-journal-current">{summary || "Hãy thao tác trên bàn để có trạng thái cần ghi."}</p>
      <label className="explore-field">Ghi chú quan sát
        <textarea className="explore-textarea" value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Em thấy gì? Vì sao?" />
      </label>
      <div className="explore-journal-actions">
        <button type="button" className="explore-btn explore-btn-primary" onClick={save} disabled={!canSave}>Lưu trạng thái này vào nhật ký</button>
        <button type="button" className="explore-btn explore-btn-secondary" onClick={exportJournal} disabled={!entries.length}>Xuất nhật ký (JSON)</button>
      </div>
      {!canSave && saveHint && <p className="explore-journal-empty" data-testid="explore-journal-hint">{saveHint}</p>}
      {entries.length
        ? <ol className="explore-journal-list">
            {[...entries].reverse().map((entry) => <li key={entry.at}><time dateTime={entry.at}>{new Date(entry.at).toLocaleString("vi-VN")}</time><b>{entry.summary}</b>{entry.note ? ` — ${entry.note}` : ""}</li>)}
          </ol>
        : <p className="explore-journal-empty">Chưa có dòng nào. Mỗi lần lưu ghi lại trạng thái đang xem và ghi chú của em.</p>}
    </section>
  );
}
