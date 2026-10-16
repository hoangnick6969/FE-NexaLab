import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Highlighter, LoaderCircle, Minus, Plus, Underline } from "lucide-react";
import { api, openMaterial, useAuth } from "./api";
import { ErrorBox, PageLoader } from "./ui";
import { PageHeading } from "./App";
import { AttributionNote, libraryQuery } from "./library";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Annotation = {
  id: string;
  pageNumber: number;
  kind: "HIGHLIGHT" | "UNDERLINE" | "NOTE";
  startOffset: number;
  endOffset: number;
  selectedText: string;
  prefix: string | null;
  suffix: string | null;
  noteText: string | null;
};
type FallbackMark = { id: string; kind: Annotation["kind"]; left: number; top: number; width: number; height: number };

const httpsUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

export function LessonDetail() {
  const { id = "" } = useParams();
  const user = useAuth((state) => state.user)!;
  const [section, setSection] = useState<"lesson" | "assessment">("lesson");
  const lessons = useQuery({ queryKey: ["lessons"], queryFn: () => api<any[]>("/lessons") });
  const canViewAttribution = ["TEACHER", "ADMIN"].includes(user.role);
  const library = useQuery({
    queryKey: ["teacher-content", "lesson-detail-attribution"],
    queryFn: () => api<{ items?: any[] }>(libraryQuery({ grade: "", domain: "", outcome: "", scope: "ALL" })),
    enabled: canViewAttribution,
  });
  const materialOpen = useMutation({ mutationFn: openMaterial });
  const lesson = lessons.data?.find((item) => item.id === id);
  const questions = Array.isArray(lesson?.questions) ? lesson.questions : [];
  const ebookUrl = httpsUrl(lesson?.subject?.ebookUrl);

  if (lessons.isLoading) return <PageLoader message="Đang mở bài học…" />;
  if (lessons.error) return <><ErrorBox error={lessons.error} /><Link className="text-button" to="/lessons">Quay lại thư viện</Link></>;
  if (!lesson) return <section className="panel lesson-detail-empty"><BookOpen /><h1>Không mở được bài học</h1><p>Bài học không tồn tại hoặc chưa được giao cho tài khoản này.</p><Link className="primary" to="/lessons">Quay lại bài học</Link></section>;

  return <div className="lesson-detail-page">
    <Link className="reader-back-link" to="/lessons"><ArrowLeft size={18} /> Thư viện bài học</Link>
    <PageHeading eyebrow={`${lesson.subject.name} · LỚP ${lesson.grade}`} title={lesson.title} description={lesson.chapter} action={lesson.synthetic ? <span className="badge outline">Dữ liệu mẫu</span> : undefined} />
    <div className="lesson-detail-actions">
      {ebookUrl && <Link className="primary" to={`/ebooks/${lesson.subjectId}`} state={{ fromLessonId: lesson.id }}><BookOpen size={17} /> Đọc ebook môn học <ArrowRight size={16} /></Link>}
      {lesson.labId && ["STUDENT", "TEACHER"].includes(user.role) && <Link className="secondary" to={`/labs/${lesson.labId}`}>Mở lab thực hành <ArrowRight size={16} /></Link>}
    </div>
    <div className="lesson-detail-tabs" role="tablist" aria-label="Nội dung bài học">
      <button type="button" role="tab" aria-selected={section === "lesson"} className={section === "lesson" ? "active" : ""} onClick={() => setSection("lesson")}>Bài học</button>
      <button type="button" role="tab" aria-selected={section === "assessment"} className={section === "assessment" ? "active" : ""} onClick={() => setSection("assessment")}>Kiểm tra kiến thức <span>{questions.length}</span></button>
    </div>
    {section === "lesson" ? <div className="lesson-detail-layout">
      <section className="panel lesson-detail-reading">
        <div className="notice"><b>Mục tiêu bài học</b><p>{lesson.learningObjective}</p>{lesson.prerequisites && <small>Kiến thức nền: {lesson.prerequisites}</small>}</div>
        <div className="lesson-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content) }} />
      </section>
      <aside className="lesson-detail-aside">
        <section className="panel"><span className="eyebrow">THUỘC CHƯƠNG</span><h2>{lesson.chapter}</h2><p className="muted">{lesson.topic}</p></section>
        {ebookUrl && <section className="panel ebook-callout"><BookOpen size={22} /><div><b>Sách giáo khoa môn {lesson.subject.name}</b><p>Mở trong trình đọc để lật trang, ghi chú và đánh dấu nội dung cần nhớ.</p><Link to={`/ebooks/${lesson.subjectId}`} state={{ fromLessonId: lesson.id }}>Mở ebook <ArrowRight size={15} /></Link></div></section>}
        {lesson.materials?.length > 0 && <section className="panel"><h2>Tài liệu bài học</h2>{lesson.materials.map((material: any, index: number) => material.url?.startsWith("asset:") ? <button className="reader-material" type="button" key={`${material.url}-${index}`} onClick={() => materialOpen.mutate(material.url)}>{material.title || `Tài liệu ${index + 1}`} <ExternalLink size={14} /></button> : <a className="reader-material" key={`${material.url}-${index}`} href={httpsUrl(material.url) ?? undefined} target="_blank" rel="noopener noreferrer">{material.title || `Tài liệu ${index + 1}`} <ExternalLink size={14} /></a>)}</section>}
        <ErrorBox error={materialOpen.error} />
        {canViewAttribution && <AttributionNote value={library.data?.items?.find((item) => item.id === lesson.id)?.attribution} />}
      </aside>
    </div> : <section className="panel lesson-assessment-panel">
      <div className="assessment-heading"><div><span className="eyebrow">TỰ KIỂM TRA</span><h2>Kiểm tra kiến thức</h2></div><span className="badge outline">{questions.length} câu hỏi</span></div>
      {user.role === "STUDENT" ? <div className="notice">Bài kiểm tra chính thức sẽ được mở trong bài đã giao để ghi nhận kết quả và tiến độ học tập.</div> : questions.length ? questions.map((question: any, index: number) => <fieldset className="assessment-question" key={question.id ?? index}><legend>{index + 1}. {question.prompt}</legend>{question.options?.map((option: any, optionIndex: number) => <p key={optionIndex}>{typeof option === "string" ? option : option.text}</p>)}</fieldset>) : <p className="muted">Bài học này chưa có câu hỏi kiểm tra.</p>}
    </section>}
  </div>;
}

export function EbookReader() {
  const { subjectId = "" } = useParams();
  const location = useLocation();
  const user = useAuth((state) => state.user)!;
  const queryClient = useQueryClient();
  const subjectQuery = useQuery({ queryKey: ["subjects"], queryFn: () => api<any[]>("/subjects") });
  const subject = subjectQuery.data?.find((item) => item.id === subjectId);
  const url = httpsUrl(subject?.ebookUrl);
  const [document, setDocument] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [fingerprint, setFingerprint] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [renderError, setRenderError] = useState("");
  const [renderRetry, setRenderRetry] = useState(0);
  const [renderedPage, setRenderedPage] = useState(0);
  const [mode, setMode] = useState<"read" | "highlight" | "underline" | "note">("read");
  const [selection, setSelection] = useState<{ text: string; start: number; end: number; prefix: string; suffix: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [fallbackMarks, setFallbackMarks] = useState<FallbackMark[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const pageHostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(760);
  const routeState = location.state as { fromLessonId?: string } | null;
  const backPath = routeState?.fromLessonId ? `/lessons/${routeState.fromLessonId}` : "/lessons";
  const annotationsQuery = useInfiniteQuery({
    queryKey: ["ebook-annotations", user.id, subjectId, fingerprint],
    queryFn: ({ pageParam }) => api<Annotation[]>(`/subjects/${encodeURIComponent(subjectId)}/ebook-annotations?fingerprint=${encodeURIComponent(fingerprint)}&skip=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.length === 500 ? pages.length * 500 : undefined,
    enabled: Boolean(fingerprint && url),
  });
  const saveAnnotation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<Annotation>(`/subjects/${encodeURIComponent(subjectId)}/ebook-annotations`, "POST", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ebook-annotations", user.id, subjectId, fingerprint] }),
  });
  const updateAnnotation = useMutation({
    mutationFn: ({ id, noteText: text }: { id: string; noteText: string }) => api(`/ebook-annotations/${encodeURIComponent(id)}`, "PUT", { kind: "NOTE", noteText: text }),
    onSuccess: () => { setEditId(null); queryClient.invalidateQueries({ queryKey: ["ebook-annotations", user.id, subjectId, fingerprint] }); },
  });
  const deleteAnnotation = useMutation({
    mutationFn: (id: string) => api(`/ebook-annotations/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ebook-annotations", user.id, subjectId, fingerprint] }),
  });

  useEffect(() => {
    if (!url) return;
    let active = true;
    const task = pdfjs.getDocument({ url, withCredentials: false });
    setLoadError(""); setDocument(null); setFingerprint(""); setPageNumber(1); setPageCount(0);
    task.promise.then((loaded) => {
      if (!active) return;
      setDocument(loaded); setPageCount(loaded.numPages);
      setFingerprint(loaded.fingerprints.find((value): value is string => Boolean(value)) ?? "");
    }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Không tải được ebook"); });
    return () => { active = false; void task.destroy(); };
  }, [url, reloadKey]);

  useEffect(() => {
    const host = pageHostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => setHostWidth(entry.contentRect.width || 760));
    observer.observe(host);
    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    if (!document || !canvasRef.current || !textLayerRef.current) return;
    let active = true;
    let renderTask: pdfjs.RenderTask | undefined;
    let textLayer: pdfjs.TextLayer | undefined;
    const canvas = canvasRef.current;
    const textContainer = textLayerRef.current;
    setRenderError("");
    void (async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (!active) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.35, Math.max(0.55, (hostWidth - 24) / base.width)) * zoom;
        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Trình duyệt không hỗ trợ hiển thị trang PDF");
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
        if (active && !(error instanceof Error && error.name === "RenderingCancelledException")) setRenderError(error instanceof Error ? error.message : "Không hiển thị được trang ebook");
      }
    })();
    setPageInput(String(pageNumber)); setSelection(null);
    return () => { active = false; renderTask?.cancel(); textLayer?.cancel(); };
  }, [document, pageNumber, hostWidth, zoom, renderRetry]);

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
  const goToPage = (next: number) => { if (Number.isInteger(next) && next >= 1 && next <= pageCount) setPageNumber(next); };

  if (subjectQuery.isLoading) return <PageLoader message="Đang mở ebook…" />;
  if (subjectQuery.error) return <><ErrorBox error={subjectQuery.error} /><Link to="/lessons">Quay lại bài học</Link></>;
  if (!subject || !url) return <section className="panel lesson-detail-empty"><BookOpen /><h1>Chưa có ebook cho môn học này</h1><p>Liên kết ebook chưa được cấu hình hoặc không an toàn.</p><Link className="primary" to="/lessons">Quay lại bài học</Link></section>;
  const annotations = annotationsQuery.data?.pages.flat() ?? [];

  return <div className="ebook-reader-page">
    <Link className="reader-back-link" to={backPath}><ArrowLeft size={18} /> {routeState?.fromLessonId ? "Quay lại bài học" : "Quay lại thư viện"}</Link>
    <PageHeading eyebrow={`SÁCH GIÁO KHOA · ${subject.name.toLocaleUpperCase("vi-VN")}`} title={`Sách ${subject.name}`} description="Đọc theo từng trang, chọn đoạn văn bản để lưu ý và ôn tập sau." action={<a className="secondary" href={url} target="_blank" rel="noopener noreferrer">Mở PDF gốc <ExternalLink size={15} /></a>} />
    {!fingerprint && document && <p className="notice">Tài liệu chưa cung cấp mã phiên bản; các tính năng đồng bộ ghi chú đang tạm khóa.</p>}
    <div className="ebook-reader-layout">
      <section className="panel ebook-reader-main">
        <div className="ebook-toolbar" aria-label="Công cụ đọc ebook">
          <div className="ebook-modes" role="group" aria-label="Chế độ đọc">
            <button type="button" className={mode === "read" ? "active" : ""} onClick={() => setMode("read")}><BookOpen size={16} /> Đọc</button>
            <button type="button" className={mode === "highlight" ? "active" : ""} onClick={() => setMode("highlight")}><Highlighter size={16} /> Tô sáng</button>
            <button type="button" className={mode === "underline" ? "active" : ""} onClick={() => setMode("underline")}><Underline size={16} /> Gạch chân</button>
            <button type="button" className={mode === "note" ? "active" : ""} onClick={() => setMode("note")}>Ghi chú</button>
          </div>
          <div className="ebook-page-controls">
            <button type="button" aria-label="Trang trước" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}><ArrowLeft size={17} /></button>
            <label><span className="sr-only">Trang hiện tại</span><input aria-label="Số trang" inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") goToPage(Number(pageInput)); }} onBlur={() => setPageInput(String(pageNumber))} /></label>
            <span>/ {pageCount || "–"}</span>
            <button type="button" aria-label="Trang sau" disabled={!pageCount || pageNumber >= pageCount} onClick={() => goToPage(pageNumber + 1)}><ArrowRight size={17} /></button>
            <button type="button" aria-label="Thu nhỏ" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, +(value - 0.15).toFixed(2)))}><Minus size={16} /></button>
            <button type="button" aria-label="Phóng to" disabled={zoom >= 1.6} onClick={() => setZoom((value) => Math.min(1.6, +(value + 0.15).toFixed(2)))}><Plus size={16} /></button>
          </div>
        </div>
        {loadError ? <div className="ebook-load-error" role="alert"><BookOpen /><h2>Không tải được sách trong trình đọc</h2><p>Kiểm tra kết nối rồi thử lại, hoặc mở PDF gốc trong tab mới.</p><button className="primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử tải lại</button> <a href={url} target="_blank" rel="noopener noreferrer">Mở PDF gốc <ExternalLink size={14} /></a><small>{loadError}</small></div> : <div className="ebook-page-viewport" ref={pageHostRef}>
          {(!document || renderError) && <div className="ebook-page-loading" role="status">{renderError ? <><b>Trang chưa hiển thị</b><span>{renderError}</span><button className="secondary" type="button" onClick={() => setRenderRetry((value) => value + 1)}>Thử hiển thị lại</button></> : <><LoaderCircle className="spin" /><span>Đang tải trang…</span></>}</div>}
          <div className="ebook-pdf-page" ref={pageRef} style={{ visibility: document && !renderError ? "visible" : "hidden" }}>
            <div className="ebook-fallback-marks" aria-hidden="true">{fallbackMarks.map((mark) => <span key={mark.id} className={`ebook-fallback-mark ${mark.kind.toLowerCase()}`} style={{ left: mark.left, top: mark.top, width: mark.width, height: mark.height }} />)}</div>
            <canvas ref={canvasRef} aria-label={`Trang ${pageNumber} của ${subject.name}`} />
            <div ref={textLayerRef} className={`textLayer ebook-text-layer${mode === "read" ? " read-only" : " annotation-mode"}`} onPointerUp={captureSelection} />
          </div>
        </div>}
        <p className="ebook-reader-hint">{mode === "read" ? "Chọn Tô sáng, Gạch chân hoặc Ghi chú, sau đó kéo chọn một đoạn trong trang." : "Kéo chọn đoạn văn bản trong trang để áp dụng công cụ đang chọn."}</p>
      </section>
      <aside className="panel ebook-annotation-panel">
        <div className="annotation-panel-heading"><div><span className="eyebrow">GHI CHÚ CỦA EM</span><h2>Đánh dấu & ghi chú</h2></div><span className="badge outline">{annotations.length}</span></div>
        {selection && <div className="ebook-selection-card"><small>Đoạn đã chọn</small><blockquote>{selection.text}</blockquote>{mode === "note" && <label className="field"><span>Ghi chú cho đoạn này</span><textarea rows={3} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Viết điều em muốn nhớ…" /></label>}{mode === "read" ? <p>Chọn một công cụ để lưu đoạn này.</p> : <button className="primary" type="button" disabled={saveAnnotation.isPending || (mode === "note" && !noteText.trim())} onClick={() => saveSelected(mode === "note" ? "NOTE" : mode === "underline" ? "UNDERLINE" : "HIGHLIGHT")}>{saveAnnotation.isPending ? "Đang lưu…" : mode === "note" ? "Lưu ghi chú" : mode === "underline" ? "Gạch chân đoạn này" : "Tô sáng đoạn này"}</button>}</div>}
        <ErrorBox error={annotationsQuery.error || saveAnnotation.error || updateAnnotation.error || deleteAnnotation.error} />
        {annotationsQuery.isLoading ? <p className="muted">Đang tải ghi chú…</p> : annotations.length === 0 ? <p className="muted">Chưa có ghi chú. Chọn một đoạn để đánh dấu hoặc ghi lại điều cần nhớ.</p> : <div className="ebook-annotation-list">{annotations.map((annotation) => <article className={`ebook-annotation-item ${annotation.kind.toLowerCase()}`} key={annotation.id}>
          <button className="annotation-quote" type="button" onClick={() => goToPage(annotation.pageNumber)}><small>TRANG {annotation.pageNumber} · {annotation.kind === "HIGHLIGHT" ? "TÔ SÁNG" : annotation.kind === "UNDERLINE" ? "GẠCH CHÂN" : "GHI CHÚ"}</small><span>{annotation.selectedText}</span></button>
          {editId === annotation.id ? <div className="annotation-edit"><textarea rows={3} value={editText} onChange={(event) => setEditText(event.target.value)} /><button type="button" className="primary" disabled={!editText.trim() || updateAnnotation.isPending} onClick={() => updateAnnotation.mutate({ id: annotation.id, noteText: editText.trim() })}>Lưu</button><button type="button" className="text-button" onClick={() => setEditId(null)}>Hủy</button></div> : annotation.noteText && <p>{annotation.noteText}</p>}
          {annotation.kind === "NOTE" && editId !== annotation.id && <button type="button" className="text-button" onClick={() => { setEditId(annotation.id); setEditText(annotation.noteText ?? ""); }}>Sửa ghi chú</button>}
          <button type="button" className="text-button" disabled={deleteAnnotation.isPending} onClick={() => deleteAnnotation.mutate(annotation.id)}>Xóa</button>
        </article>)}</div>}
        {annotationsQuery.hasNextPage && <button className="secondary" type="button" disabled={annotationsQuery.isFetchingNextPage} onClick={() => annotationsQuery.fetchNextPage()}>{annotationsQuery.isFetchingNextPage ? "Đang tải…" : "Tải ghi chú cũ hơn"}</button>}
        <p className="tiny muted">Ghi chú chỉ hiển thị với tài khoản của em và được đồng bộ theo phiên bản sách.</p>
      </aside>
    </div>
  </div>;
}

function rangeForOffsets(container: HTMLElement, startOffset: number, endOffset: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node = walker.nextNode() as Text | null;
  let cursor = 0;
  let started = false;
  while (node) {
    const end = cursor + node.length;
    if (!started && startOffset >= cursor && startOffset <= end) {
      range.setStart(node, Math.min(node.length, startOffset - cursor));
      started = true;
    }
    if (started && endOffset <= end) {
      range.setEnd(node, Math.min(node.length, endOffset - cursor));
      return range;
    }
    cursor = end;
    node = walker.nextNode() as Text | null;
  }
  return null;
}
