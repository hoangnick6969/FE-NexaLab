import { useState } from "react";
import { useMutation, type UseInfiniteQueryResult, type InfiniteData } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "../../lib/api";
import { ErrorBox } from "../../components/ui";
import { t } from "./ebookText";
import type { Annotation } from "./annotations";

type Mode = "read" | "highlight" | "underline" | "note";
type Selection = { text: string; start: number; end: number; prefix: string; suffix: string };

/** Slide-over list of the reader's marks and notes, plus the card that saves the current selection. */
export function EbookAnnotationPanel({ open, onClose, annotationsQuery, annotations, selection, mode, noteText, setNoteText, onSave, savePending, saveError, onChanged, goToPage }: {
  open: boolean;
  onClose: () => void;
  annotationsQuery: UseInfiniteQueryResult<InfiniteData<Annotation[]>>;
  annotations: Annotation[];
  selection: Selection | null;
  mode: Mode;
  noteText: string;
  setNoteText: (value: string) => void;
  onSave: (kind: Annotation["kind"]) => void;
  savePending: boolean;
  saveError: unknown;
  onChanged: () => void;
  goToPage: (page: number) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const updateAnnotation = useMutation({
    mutationFn: ({ id, noteText: text }: { id: string; noteText: string }) => api(`/ebook-annotations/${encodeURIComponent(id)}`, "PUT", { kind: "NOTE", noteText: text }),
    onSuccess: () => { setEditId(null); onChanged(); },
  });
  const deleteAnnotation = useMutation({
    mutationFn: (id: string) => api(`/ebook-annotations/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: onChanged,
  });

  return <>
    {open && <button className="ebook-notes-scrim" type="button" aria-label={t.closeNotes} onClick={onClose} />}
    <aside id="ebook-notes-panel" className={`panel ebook-annotation-panel${open ? " is-open" : ""}`} aria-hidden={!open}>
      <button className="ebook-notes-close" type="button" aria-label={t.closeNotes} onClick={onClose}><X size={19} /></button>
      <div className="annotation-panel-heading"><div><span className="eyebrow">{t.yourNotes}</span><h2>{t.marksAndNotes}</h2></div><span className="badge outline">{annotations.length}</span></div>
      {selection && <div className="ebook-selection-card"><small>{t.selected}</small><blockquote>{selection.text}</blockquote>{mode === "note" && <label className="field"><span>{t.noteFor}</span><textarea rows={3} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={t.notePlaceholder} /></label>}{mode === "read" ? <p>{t.chooseTool}</p> : <button className="primary" type="button" disabled={savePending || (mode === "note" && !noteText.trim())} onClick={() => onSave(mode === "note" ? "NOTE" : mode === "underline" ? "UNDERLINE" : "HIGHLIGHT")}>{savePending ? t.saving : mode === "note" ? t.saveNote : mode === "underline" ? t.underlineThis : t.highlightThis}</button>}</div>}
      <ErrorBox error={annotationsQuery.error || saveError || updateAnnotation.error || deleteAnnotation.error} />
      {annotationsQuery.isLoading ? <p className="muted">{t.loadingNotes}</p> : annotations.length === 0 ? <p className="muted">{t.noNotes}</p> : <div className="ebook-annotation-list">{annotations.map((annotation) => <article className={`ebook-annotation-item ${annotation.kind.toLowerCase()}`} key={annotation.id}>
        <button className="annotation-quote" type="button" onClick={() => goToPage(annotation.pageNumber)}><small>{t.pageCaps(annotation.pageNumber)} · {annotation.kind === "HIGHLIGHT" ? t.kindHighlight : annotation.kind === "UNDERLINE" ? t.kindUnderline : t.kindNote}</small><span>{annotation.selectedText}</span></button>
        {editId === annotation.id ? <div className="annotation-edit"><textarea rows={3} value={editText} onChange={(event) => setEditText(event.target.value)} /><button type="button" className="primary" disabled={!editText.trim() || updateAnnotation.isPending} onClick={() => updateAnnotation.mutate({ id: annotation.id, noteText: editText.trim() })}>{t.save}</button><button type="button" className="text-button" onClick={() => setEditId(null)}>{t.cancel}</button></div> : annotation.noteText && <p>{annotation.noteText}</p>}
        {annotation.kind === "NOTE" && editId !== annotation.id && <button type="button" className="text-button" onClick={() => { setEditId(annotation.id); setEditText(annotation.noteText ?? ""); }}>{t.editNote}</button>}
        <button type="button" className="text-button" disabled={deleteAnnotation.isPending} onClick={() => deleteAnnotation.mutate(annotation.id)}>{t.delete}</button>
      </article>)}</div>}
      {annotationsQuery.hasNextPage && <button className="secondary" type="button" disabled={annotationsQuery.isFetchingNextPage} onClick={() => annotationsQuery.fetchNextPage()}>{annotationsQuery.isFetchingNextPage ? t.loading : t.olderNotes}</button>}
      <p className="tiny muted">{t.privacy}</p>
    </aside>
  </>;
}
