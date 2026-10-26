import { useEffect, useRef, useState } from "react";
import type { RenderTask, TextLayer as PdfTextLayer } from "pdfjs-dist";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Columns2, ExternalLink, Highlighter, LoaderCircle, Maximize2, Minimize2, Minus, Plus, StickyNote, Underline } from "lucide-react";
import { api, useAuth } from "../../lib/api";
import { ErrorBox, PageLoader } from "../../components/ui";
import { httpsUrl } from "../../lib/urls";
import { t } from "./ebookText";
import { rangeForOffsets, type Annotation, type FallbackMark } from "./annotations";
import { EbookCompanionPage } from "./EbookCompanionPage";
import { EbookAnnotationPanel } from "./EbookAnnotationPanel";
import { usePdfDocument } from "./usePdfDocument";
import "./ebook.css";

export function EbookReader() {
  const { subjectId = "" } = useParams();
  const location = useLocation();
  const user = useAuth((state) => state.user)!;
  const queryClient = useQueryClient();
  const routeState = location.state as { fromLessonId?: string; initialPhysicalPage?: number; ebookUrl?: string } | null;
  const subjectQuery = useQuery({ queryKey: ["subjects"], queryFn: () => api<any[]>("/subjects") });
  const subject = subjectQuery.data?.find((item) => item.id === subjectId);
  const url = httpsUrl(routeState?.ebookUrl) ?? httpsUrl(subject?.ebookUrl);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const { pdfjs, document, pageCount, fingerprint, loadError, reload } = usePdfDocument(url, routeState?.initialPhysicalPage, (page) => { setPageNumber(page); setPageInput(String(page)); });
  const [renderError, setRenderError] = useState("");
  const [renderRetry, setRenderRetry] = useState(0);
  const [renderedPage, setRenderedPage] = useState(0);
  const [mode, setMode] = useState<"read" | "highlight" | "underline" | "note">("read");
  const [selection, setSelection] = useState<{ text: string; start: number; end: number; prefix: string; suffix: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [zoom, setZoom] = useState(1);
  const [fallbackMarks, setFallbackMarks] = useState<FallbackMark[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [bookView, setBookView] = useState(() => window.innerWidth >= 1024);
  const [notesOpen, setNotesOpen] = useState(false);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");
  const [turnKey, setTurnKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const pageHostRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [hostSize, setHostSize] = useState({ width: 760, height: 640 });
  const useSpread = bookView && hostSize.width >= 760 && pageNumber > 1;
  const backPath = routeState?.fromLessonId ? `/lessons/${routeState.fromLessonId}` : "/lessons";
  const annotationsQuery = useInfiniteQuery({
    queryKey: ["ebook-annotations", user.id, subjectId, fingerprint],
    queryFn: ({ pageParam }) => api<Annotation[]>(`/subjects/${encodeURIComponent(subjectId)}/ebook-annotations?fingerprint=${encodeURIComponent(fingerprint)}&skip=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.length === 500 ? pages.length * 500 : undefined,
    enabled: Boolean(fingerprint && url),
  });
  const refreshAnnotations = () => queryClient.invalidateQueries({ queryKey: ["ebook-annotations", user.id, subjectId, fingerprint] });
  const saveAnnotation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<Annotation>(`/subjects/${encodeURIComponent(subjectId)}/ebook-annotations`, "POST", body),
    onSuccess: refreshAnnotations,
  });
  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(window.document.fullscreenElement === readerRef.current);
    window.document.addEventListener("fullscreenchange", updateFullscreen);
    return () => window.document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const host = pageHostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => setHostSize({ width: entry.contentRect.width || 760, height: entry.contentRect.height || 640 }));
    observer.observe(host);
    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); turnPage("previous"); }
      if (event.key === "ArrowRight") { event.preventDefault(); turnPage("next"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!pdfjs || !document || !canvasRef.current || !textLayerRef.current) return;
    let active = true;
    let renderTask: RenderTask | undefined;
    let textLayer: PdfTextLayer | undefined;
    const canvas = canvasRef.current;
    const textContainer = textLayerRef.current;
    setRenderError("");
    void (async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (!active) return;
        const base = page.getViewport({ scale: 1 });
        const currentHostWidth = pageHostRef.current?.clientWidth || hostSize.width;
        const currentHostHeight = pageHostRef.current?.clientHeight || hostSize.height;
        const spreadWidth = useSpread ? (currentHostWidth - 76) / 2 : currentHostWidth - 48;
        const fitWidth = spreadWidth / base.width;
        const viewportHeight = Math.max(260, window.innerHeight - (isFullscreen ? 150 : 300));
        const fitHeight = Math.min(currentHostHeight - 34, viewportHeight) / base.height;
        const scale = Math.min(1.45, Math.max(0.02, Math.min(fitWidth, fitHeight))) * zoom;
        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d");
        if (!context) throw new Error(t.noCanvas);
        canvas.width = Math.floor(viewport.width * outputScale); canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
        textContainer.style.width = `${viewport.width}px`; textContainer.style.height = `${viewport.height}px`;
        textContainer.replaceChildren();
        renderTask = page.render({ canvas, canvasContext: context, viewport, ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }) });
        await renderTask.promise;
        if (!active) return;
        const content = await page.getTextContent();
        if (!active) return;
        textLayer = new pdfjs.TextLayer({ textContentSource: content, container: textContainer, viewport });
        await textLayer.render();
        if (active) setRenderedPage((value) => value + 1);
      } catch (error) {
        if (active && !(error instanceof Error && error.name === "RenderingCancelledException")) setRenderError(error instanceof Error ? error.message : t.renderFailed);
      }
    })();
    setPageInput(String(pageNumber)); setSelection(null);
    return () => { active = false; renderTask?.cancel(); textLayer?.cancel(); };
  }, [pdfjs, document, pageNumber, hostSize, zoom, renderRetry, useSpread, isFullscreen]);

  useEffect(() => {
    const container = textLayerRef.current;
    const highlightApi = (window.CSS as any)?.highlights;
    const HighlightCtor = (window as any).Highlight;
    if (!container) return;
    if (highlightApi) {
      highlightApi.delete("nexalab-highlight"); highlightApi.delete("nexalab-underline"); highlightApi.delete("nexalab-note");
    }
    const ranges: Record<string, Range[]> = { HIGHLIGHT: [], UNDERLINE: [], NOTE: [] };
    const fallback: FallbackMark[] = [];
    const pageBounds = pageRef.current?.getBoundingClientRect();
    for (const annotation of annotationsQuery.data?.pages.flat() ?? []) {
      if (annotation.pageNumber !== pageNumber) continue;
      const range = rangeForOffsets(container, annotation.startOffset, annotation.endOffset);
      if (!range) continue;
      ranges[annotation.kind].push(range);
      if ((!highlightApi || !HighlightCtor) && pageBounds) {
        Array.from(range.getClientRects()).forEach((rect, index) => fallback.push({
          id: `${annotation.id}-${index}`, kind: annotation.kind,
          left: rect.left - pageBounds.left, top: rect.top - pageBounds.top,
          width: rect.width, height: rect.height,
        }));
      }
    }
    setFallbackMarks(fallback);
    if (!highlightApi || !HighlightCtor) return;
    for (const [kind, name] of [["HIGHLIGHT", "nexalab-highlight"], ["UNDERLINE", "nexalab-underline"], ["NOTE", "nexalab-note"]]) {
      if (ranges[kind].length) highlightApi.set(name, new HighlightCtor(...ranges[kind]));
    }
    return () => { highlightApi.delete("nexalab-highlight"); highlightApi.delete("nexalab-underline"); highlightApi.delete("nexalab-note"); };
  }, [annotationsQuery.data, pageNumber, renderedPage]);

  const saveSelected = (kind: Annotation["kind"]) => {
    if (!selection || !fingerprint || (kind === "NOTE" && !noteText.trim())) return;
    saveAnnotation.mutate({ documentFingerprint: fingerprint, pageNumber, kind, startOffset: selection.start, endOffset: selection.end, selectedText: selection.text, prefix: selection.prefix, suffix: selection.suffix, noteText: kind === "NOTE" ? noteText.trim() : null }, { onSuccess: () => { setSelection(null); setNoteText(""); setMode("read"); window.getSelection()?.removeAllRanges(); } });
  };
  const captureSelection = () => {
    if (mode === "read") return;
    const container = textLayerRef.current;
    const selected = window.getSelection();
    if (!container || !selected?.rangeCount || selected.isCollapsed) return;
    const range = selected.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const rawText = range.toString();
    const selectedText = rawText.trim();
    if (!selectedText || selectedText.length > 2000) return;
    const before = range.cloneRange(); before.selectNodeContents(container); before.setEnd(range.startContainer, range.startOffset);
    const pageText = container.textContent ?? "";
    const start = before.toString().length + (rawText.length - rawText.trimStart().length);
    const end = start + selectedText.length;
    setSelection({ text: selectedText, start, end, prefix: pageText.slice(Math.max(0, start - 120), start), suffix: pageText.slice(end, end + 120) });
  };
  useEffect(() => {
    window.document.addEventListener("selectionchange", captureSelection);
    return () => window.document.removeEventListener("selectionchange", captureSelection);
  }, [pageNumber, mode]);
  const goToPage = (next: number, direction?: "next" | "previous") => {
    if (!Number.isInteger(next) || next < 1 || next > pageCount || next === pageNumber) return;
    setTurnDirection(direction ?? (next > pageNumber ? "next" : "previous"));
    setTurnKey((value) => value + 1);
    setPageNumber(next);
  };
  const turnPage = (direction: "next" | "previous") => {
    const step = useSpread ? 2 : 1;
    const next = direction === "next"
      ? (bookView && hostSize.width >= 760 && pageNumber === 1 ? 2 : Math.min(pageCount, pageNumber + step))
      : (bookView && hostSize.width >= 760 && pageNumber <= 2 ? 1 : Math.max(1, pageNumber - step));
    goToPage(next, direction);
  };
  const toggleFullscreen = async () => {
    try {
      if (window.document.fullscreenElement) await window.document.exitFullscreen();
      else await readerRef.current?.requestFullscreen();
      setFullscreenError("");
    } catch {
      setFullscreenError(t.noFullscreen);
    }
  };
  const finishPageSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || event.pointerType !== "touch" || mode !== "read") return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.25) turnPage(dx < 0 ? "next" : "previous");
  };

  if (subjectQuery.isLoading) return <PageLoader message={t.opening} />;
  if (subjectQuery.error) return <><ErrorBox error={subjectQuery.error} /><Link to="/lessons">{t.backToLesson}</Link></>;
  if (!subject || !url) return <section className="panel lesson-detail-empty"><BookOpen /><h1>{t.noEbook}</h1><p>{t.unsafeLink}</p><Link className="primary" to="/lessons">{t.backToLesson}</Link></section>;
  const annotations = annotationsQuery.data?.pages.flat() ?? [];
  const companionPage = useSpread
    ? (pageNumber % 2 === 0 ? pageNumber + 1 : pageNumber - 1)
    : null;
  const activePageIsRight = Boolean(companionPage && pageNumber % 2 === 1);

  return <div className={`ebook-reader-page${selection && mode !== "read" ? " has-ebook-selection" : ""}`} ref={readerRef}>
    {!fingerprint && document && <p className="notice">{t.noFingerprint}</p>}
    <div className="ebook-reader-layout">
      <section className="ebook-reader-main">
        <div className="ebook-toolbar" aria-label={t.toolbar}>
          <div className="ebook-book-identity">
            <Link className="ebook-icon-button" aria-label={routeState?.fromLessonId ? t.backToLesson : t.backToLibrary} to={backPath}><ArrowLeft size={20} /></Link>
            <div><strong>{t.textbookShort(subject.name)}</strong><small>{t.digitalTextbook}</small></div>
          </div>
          <div className="ebook-page-controls ebook-page-controls-primary">
            <button type="button" aria-label={t.firstPage} disabled={pageNumber <= 1} onClick={() => goToPage(1, "previous")}><span aria-hidden="true">«</span></button>
            <button type="button" aria-label={t.previousPage} disabled={pageNumber <= 1} onClick={() => turnPage("previous")}><ArrowLeft size={17} /></button>
            <label><span className="sr-only">{t.currentPage}</span><input aria-label={t.pageNumber} inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") goToPage(Number(pageInput)); }} onBlur={() => setPageInput(String(pageNumber))} /></label>
            <span>/ {pageCount || "–"}</span>
            <button type="button" aria-label="Trang sau" disabled={!pageCount || pageNumber >= pageCount} onClick={() => turnPage("next")}><ArrowRight size={17} /></button>
            <button type="button" aria-label={t.lastPage} disabled={!pageCount || pageNumber >= pageCount} onClick={() => goToPage(pageCount, "next")}><span aria-hidden="true">»</span></button>
          </div>
          <div className="ebook-toolbar-actions">
            <button type="button" aria-label={t.zoomOut} disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, +(value - 0.15).toFixed(2)))}><Minus size={17} /></button>
            <span className="ebook-zoom-value">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label={t.zoomIn} disabled={zoom >= 1.6} onClick={() => setZoom((value) => Math.min(1.6, +(value + 0.15).toFixed(2)))}><Plus size={17} /></button>
            <button type="button" className={bookView ? "active" : ""} aria-pressed={bookView} aria-label={bookView ? t.toSingle : t.toDouble} title={bookView ? t.single : t.double} onClick={() => setBookView((value) => !value)}><Columns2 size={18} /></button>
            <button type="button" className={notesOpen ? "active" : ""} aria-expanded={notesOpen} aria-controls="ebook-notes-panel" aria-label={t.openNotes} onClick={() => setNotesOpen((value) => !value)}><StickyNote size={18} /><span className="ebook-note-count">{annotations.length}</span></button>
            <a className="ebook-toolbar-link" href={url} aria-label={t.openOriginalLabel} title={t.openOriginalLabel} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /></a>
            <button type="button" aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen} title={isFullscreen ? t.exitFullscreen : t.fullscreen} onClick={toggleFullscreen}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          </div>
          <div className="ebook-modes" role="group" aria-label={t.markTools}>
            <button type="button" className={mode === "read" ? "active" : ""} onClick={() => setMode("read")}><BookOpen size={16} /> {t.read}</button>
            <button type="button" className={mode === "highlight" ? "active" : ""} onClick={() => setMode("highlight")}><Highlighter size={16} /> {t.highlight}</button>
            <button type="button" className={mode === "underline" ? "active" : ""} onClick={() => setMode("underline")}><Underline size={16} /> {t.underline}</button>
            <button type="button" className={mode === "note" ? "active" : ""} onClick={() => setMode("note")}><StickyNote size={16} /> {t.note}</button>
          </div>
        </div>
        {fullscreenError && <p className="notice" role="status">{fullscreenError}</p>}
        {loadError ? <div className="ebook-load-error" role="alert"><BookOpen /><h2>{t.loadInReaderFailed}</h2><p>{t.checkConnection}</p><button className="primary" type="button" onClick={reload}>{t.reload}</button> <a href={url} target="_blank" rel="noopener noreferrer">{t.openOriginal} <ExternalLink size={14} /></a><small>{loadError}</small></div> : <div className="ebook-page-viewport" ref={pageHostRef} onPointerDown={(event) => { swipeStartRef.current = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null; }} onPointerUp={finishPageSwipe} onPointerCancel={() => { swipeStartRef.current = null; }}>
          <button className="ebook-edge-control previous" type="button" aria-label={t.previousPage} disabled={pageNumber <= 1} onClick={() => turnPage("previous")}><ArrowLeft size={22} /></button>
          {(!document || renderError) && <div className="ebook-page-loading" role="status">{renderError ? <><b>{t.notShown}</b><span>{renderError}</span><button className="secondary" type="button" onClick={() => setRenderRetry((value) => value + 1)}>{t.renderAgain}</button></> : <><LoaderCircle className="spin" /><span>{t.loadingPage}</span></>}</div>}
          <div key={turnKey} className={`ebook-book${companionPage ? " is-spread" : " is-single"} turn-${turnDirection}`}>
            {document && companionPage && activePageIsRight && <EbookCompanionPage document={document} pageNumber={companionPage} zoom={zoom} onActivate={() => goToPage(companionPage, "previous")} />}
            <div className="ebook-pdf-page active-page" ref={pageRef} style={{ visibility: document && !renderError ? "visible" : "hidden" }}>
              <div className="ebook-fallback-marks" aria-hidden="true">{fallbackMarks.map((mark) => <span key={mark.id} className={`ebook-fallback-mark ${mark.kind.toLowerCase()}`} style={{ left: mark.left, top: mark.top, width: mark.width, height: mark.height }} />)}</div>
              <canvas ref={canvasRef} aria-label={t.pageOf(pageNumber, subject.name)} />
              <div ref={textLayerRef} className={`textLayer ebook-text-layer${mode === "read" ? " read-only" : " annotation-mode"}`} onPointerUp={captureSelection} />
            </div>
            {document && companionPage && !activePageIsRight && companionPage <= pageCount && <EbookCompanionPage document={document} pageNumber={companionPage} zoom={zoom} onActivate={() => goToPage(companionPage, "next")} />}
          </div>
          <button className="ebook-edge-control next" type="button" aria-label="Trang sau" disabled={!pageCount || pageNumber >= pageCount} onClick={() => turnPage("next")}><ArrowRight size={22} /></button>
        </div>}
        <div className="ebook-reader-footer">
          <span>Trang {pageNumber} / {pageCount || "–"}</span>
          <input type="range" aria-label={t.readingProgress} min="1" max={Math.max(1, pageCount)} value={Math.min(pageNumber, Math.max(1, pageCount))} onChange={(event) => goToPage(Number(event.target.value))} />
          <span>{mode === "read" ? t.swipeHint : t.dragHint}</span>
        </div>
      </section>
      <EbookAnnotationPanel
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        annotationsQuery={annotationsQuery}
        annotations={annotations}
        selection={selection}
        mode={mode}
        noteText={noteText}
        setNoteText={setNoteText}
        onSave={saveSelected}
        savePending={saveAnnotation.isPending}
        saveError={saveAnnotation.error}
        onChanged={refreshAnnotations}
        goToPage={goToPage}
      />
    </div>
  </div>;
}
