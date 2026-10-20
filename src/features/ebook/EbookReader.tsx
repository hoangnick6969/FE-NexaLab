import { useEffect, useRef, useState } from "react";
import type { PDFDataRangeTransport, PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask, TextLayer as PdfTextLayer } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Columns2, ExternalLink, Highlighter, LoaderCircle, Maximize2, Minimize2, Minus, Plus, StickyNote, Underline, X } from "lucide-react";
import { api, useAuth } from "../../lib/api";
import { ErrorBox, PageLoader } from "../../components/ui";
import { httpsUrl } from "../../lib/urls";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    choosePage: (n: number) => `Chọn trang ${n}`,
    readerFailed: "Không tải được bộ đọc ebook",
    partialFailed: "Máy chủ không trả được một phần trang PDF",
    pageDataFailed: "Không tải được dữ liệu trang PDF",
    ebookFailed: "Không tải được ebook",
    noCanvas: "Trình duyệt không hỗ trợ hiển thị trang PDF",
    renderFailed: "Không hiển thị được trang ebook",
    noFullscreen: "Trình duyệt này chưa hỗ trợ chế độ toàn màn hình.",
    opening: "Đang mở ebook…",
    backToLesson: "Quay lại bài học",
    noEbook: "Chưa có ebook cho môn học này",
    unsafeLink: "Liên kết ebook chưa được cấu hình hoặc không an toàn.",
    noFingerprint: "Tài liệu chưa cung cấp mã phiên bản; các tính năng đồng bộ ghi chú đang tạm khóa.",
    toolbar: "Công cụ đọc ebook",
    backToLibrary: "Quay lại thư viện",
    textbookShort: (subject: string) => `SGK ${subject}`,
    digitalTextbook: "Sách giáo khoa điện tử",
    firstPage: "Về trang đầu",
    previousPage: "Trang trước",
    currentPage: "Trang hiện tại",
    pageNumber: "Số trang",
    lastPage: "Về trang cuối",
    zoomOut: "Thu nhỏ",
    zoomIn: "Phóng to",
    toSingle: "Chuyển sang một trang",
    toDouble: "Chuyển sang hai trang",
    single: "Một trang",
    double: "Hai trang",
    openNotes: "Mở ghi chú",
    openOriginalLabel: "Mở PDF gốc",
    exitFullscreen: "Thoát toàn màn hình",
    fullscreen: "Toàn màn hình",
    markTools: "Công cụ đánh dấu",
    read: "Đọc",
    highlight: "Tô sáng",
    underline: "Gạch chân",
    note: "Ghi chú",
    loadInReaderFailed: "Không tải được sách trong trình đọc",
    checkConnection: "Kiểm tra kết nối rồi thử lại, hoặc mở PDF gốc trong tab mới.",
    reload: "Thử tải lại",
    openOriginal: "Mở PDF gốc",
    notShown: "Trang chưa hiển thị",
    renderAgain: "Thử hiển thị lại",
    loadingPage: "Đang tải trang…",
    pageOf: (n: number, subject: string) => `Trang ${n} của ${subject}`,
    readingProgress: "Tiến độ đọc sách",
    swipeHint: "Vuốt hoặc dùng phím ← →",
    dragHint: "Kéo chọn nội dung trên trang",
    closeNotes: "Đóng ghi chú",
    yourNotes: "GHI CHÚ CỦA EM",
    marksAndNotes: "Đánh dấu & ghi chú",
    selected: "Đoạn đã chọn",
    noteFor: "Ghi chú cho đoạn này",
    notePlaceholder: "Viết điều em muốn nhớ…",
    chooseTool: "Chọn một công cụ để lưu đoạn này.",
    saving: "Đang lưu…",
    saveNote: "Lưu ghi chú",
    underlineThis: "Gạch chân đoạn này",
    highlightThis: "Tô sáng đoạn này",
    loadingNotes: "Đang tải ghi chú…",
    noNotes: "Chưa có ghi chú. Chọn một đoạn để đánh dấu hoặc ghi lại điều cần nhớ.",
    pageCaps: (n: number) => `TRANG ${n}`,
    kindHighlight: "TÔ SÁNG",
    kindUnderline: "GẠCH CHÂN",
    kindNote: "GHI CHÚ",
    save: "Lưu",
    cancel: "Hủy",
    editNote: "Sửa ghi chú",
    delete: "Xóa",
    loading: "Đang tải…",
    olderNotes: "Tải ghi chú cũ hơn",
    privacy: "Ghi chú chỉ hiển thị với tài khoản của em và được đồng bộ theo phiên bản sách.",
  },
  en: {
    choosePage: (n: number) => `Choose page ${n}`,
    readerFailed: "The ebook reader could not be loaded",
    partialFailed: "The server could not return part of the PDF page",
    pageDataFailed: "The PDF page data could not be loaded",
    ebookFailed: "The ebook could not be loaded",
    noCanvas: "This browser cannot display PDF pages",
    renderFailed: "The ebook page could not be displayed",
    noFullscreen: "This browser does not support full screen.",
    opening: "Opening the ebook…",
    backToLesson: "Back to the lesson",
    noEbook: "No ebook for this subject yet",
    unsafeLink: "The ebook link is not configured or not safe.",
    noFingerprint: "The document has no version id; note syncing is paused.",
    toolbar: "Ebook reading tools",
    backToLibrary: "Back to the library",
    textbookShort: (subject: string) => `${subject} textbook`,
    digitalTextbook: "Digital textbook",
    firstPage: "First page",
    previousPage: "Previous page",
    currentPage: "Current page",
    pageNumber: "Page number",
    lastPage: "Last page",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    toSingle: "Switch to one page",
    toDouble: "Switch to two pages",
    single: "One page",
    double: "Two pages",
    openNotes: "Open notes",
    openOriginalLabel: "Open the original PDF",
    exitFullscreen: "Exit full screen",
    fullscreen: "Full screen",
    markTools: "Marking tools",
    read: "Read",
    highlight: "Highlight",
    underline: "Underline",
    note: "Note",
    loadInReaderFailed: "The book could not load in the reader",
    checkConnection: "Check your connection and try again, or open the original PDF in a new tab.",
    reload: "Reload",
    openOriginal: "Open the original PDF",
    notShown: "The page is not shown",
    renderAgain: "Try displaying again",
    loadingPage: "Loading the page…",
    pageOf: (n: number, subject: string) => `Page ${n} of ${subject}`,
    readingProgress: "Reading progress",
    swipeHint: "Swipe or use the ← → keys",
    dragHint: "Drag to select text on the page",
    closeNotes: "Close notes",
    yourNotes: "YOUR NOTES",
    marksAndNotes: "Marks & notes",
    selected: "Selected text",
    noteFor: "Note for this passage",
    notePlaceholder: "Write what you want to remember…",
    chooseTool: "Choose a tool to save this passage.",
    saving: "Saving…",
    saveNote: "Save note",
    underlineThis: "Underline this passage",
    highlightThis: "Highlight this passage",
    loadingNotes: "Loading notes…",
    noNotes: "No notes yet. Select a passage to mark it or note what to remember.",
    pageCaps: (n: number) => `PAGE ${n}`,
    kindHighlight: "HIGHLIGHT",
    kindUnderline: "UNDERLINE",
    kindNote: "NOTE",
    save: "Save",
    cancel: "Cancel",
    editNote: "Edit note",
    delete: "Delete",
    loading: "Loading…",
    olderNotes: "Load older notes",
    privacy: "Notes are visible only to your account and sync with the book version.",
  },
});
const t = text();

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

function EbookCompanionPage({ document, pageNumber, zoom, onActivate }: { document: PDFDocumentProxy; pageNumber: number; zoom: number; onActivate: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    let renderTask: RenderTask | undefined;
    setReady(false);
    void document.getPage(pageNumber).then((page) => {
      if (!active) return;
      const base = page.getViewport({ scale: 1 });
      const host = canvas.closest(".ebook-page-viewport") as HTMLElement | null;
      const maxWidth = ((host?.clientWidth || 760) - 76) / 2;
      const viewportHeight = Math.max(260, window.innerHeight - (window.document.fullscreenElement ? 150 : 300));
      const maxHeight = Math.min((host?.clientHeight || 520) - 34, viewportHeight);
      const scale = Math.min(1.45, Math.max(0.02, Math.min(maxWidth / base.width, maxHeight / base.height))) * zoom;
      const viewport = page.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport, ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }) });
      return renderTask.promise;
    }).then(() => { if (active) setReady(true); }).catch((error: unknown) => {
      if (active && !(error instanceof Error && error.name === "RenderingCancelledException")) setReady(false);
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, pageNumber, zoom]);

  return <div className={`ebook-pdf-page companion-page${ready ? " is-ready" : ""}`} role="button" tabIndex={0} aria-label={t.choosePage(pageNumber)} onClick={onActivate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onActivate(); } }}>
    {!ready && <LoaderCircle className="spin companion-loader" aria-hidden="true" />}
    <canvas ref={canvasRef} />
  </div>;
}

export function EbookReader() {
  const { subjectId = "" } = useParams();
  const location = useLocation();
  const user = useAuth((state) => state.user)!;
  const queryClient = useQueryClient();
  const routeState = location.state as { fromLessonId?: string; initialPhysicalPage?: number; ebookUrl?: string } | null;
  const [pdfjs, setPdfjs] = useState<typeof import("pdfjs-dist") | null>(null);
  const subjectQuery = useQuery({ queryKey: ["subjects"], queryFn: () => api<any[]>("/subjects") });
  const subject = subjectQuery.data?.find((item) => item.id === subjectId);
  const url = httpsUrl(routeState?.ebookUrl) ?? httpsUrl(subject?.ebookUrl);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
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
    let active = true;
    void import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc = workerUrl;
      if (active) setPdfjs(module);
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : t.readerFailed);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!url || !pdfjs) return;
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    let rangeTransport: PDFDataRangeTransport | undefined;
    const rangeControllers = new Set<AbortController>();
    const loadController = new AbortController();
    setLoadError(""); setDocument(null); setFingerprint(""); setPageNumber(1); setPageCount(0);
    const load = async () => {
      try {
        let length = 0;
        let firstRange: Response | null = null;
        try {
          const head = await fetch(url, { method: "HEAD", signal: loadController.signal });
          length = Number(head.headers.get("content-length"));
          if (!head.ok || !Number.isSafeInteger(length) || length <= 0) length = 0;
          if (length) firstRange = await fetch(url, { headers: { Range: "bytes=0-262143" }, signal: loadController.signal });
        } catch {
          // Fall back to PDF.js URL loading when storage does not support range metadata.
        }
        if (!active) return;
        if (length && firstRange?.status === 206) {
          const initialData = new Uint8Array(await firstRange.arrayBuffer());
          if (!active) return;
          rangeTransport = new pdfjs.PDFDataRangeTransport(length, initialData);
          rangeTransport.requestDataRange = (begin, end) => {
            const controller = new AbortController();
            rangeControllers.add(controller);
            void fetch(url, { headers: { Range: `bytes=${begin}-${end - 1}` }, signal: controller.signal })
              .then(async (response) => {
                if (response.status !== 206) throw new Error(t.partialFailed);
                return new Uint8Array(await response.arrayBuffer());
              })
              .then((data) => { if (active) rangeTransport?.onDataRange(begin, data); })
              .catch((error: unknown) => {
                if (active && !(error instanceof Error && error.name === "AbortError")) {
                  setLoadError(error instanceof Error ? error.message : t.pageDataFailed);
                  void task?.destroy();
                }
              })
              .finally(() => rangeControllers.delete(controller));
          };
          rangeTransport.abort = () => { rangeControllers.forEach((controller) => controller.abort()); rangeControllers.clear(); };
          task = pdfjs.getDocument({ range: rangeTransport, rangeChunkSize: 262144, disableStream: true, disableAutoFetch: true });
        } else {
          await firstRange?.body?.cancel();
        }
        task ??= pdfjs.getDocument({ url, withCredentials: false });
        const loaded = await task.promise;
        if (!active) return;
        const initial = Number.isInteger(routeState?.initialPhysicalPage) ? routeState!.initialPhysicalPage! : 1;
        const startPage = Math.min(loaded.numPages, Math.max(1, initial));
        setDocument(loaded); setPageCount(loaded.numPages); setPageNumber(startPage); setPageInput(String(startPage));
        setFingerprint(loaded.fingerprints.find((value): value is string => Boolean(value)) ?? "");
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : t.ebookFailed);
      }
    };
    void load();
    return () => { active = false; loadController.abort(); rangeTransport?.abort(); void task?.destroy(); };
  }, [pdfjs, url, reloadKey, routeState?.initialPhysicalPage]);

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
        {loadError ? <div className="ebook-load-error" role="alert"><BookOpen /><h2>{t.loadInReaderFailed}</h2><p>{t.checkConnection}</p><button className="primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>{t.reload}</button> <a href={url} target="_blank" rel="noopener noreferrer">{t.openOriginal} <ExternalLink size={14} /></a><small>{loadError}</small></div> : <div className="ebook-page-viewport" ref={pageHostRef} onPointerDown={(event) => { swipeStartRef.current = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null; }} onPointerUp={finishPageSwipe} onPointerCancel={() => { swipeStartRef.current = null; }}>
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
      {notesOpen && <button className="ebook-notes-scrim" type="button" aria-label={t.closeNotes} onClick={() => setNotesOpen(false)} />}
      <aside id="ebook-notes-panel" className={`panel ebook-annotation-panel${notesOpen ? " is-open" : ""}`} aria-hidden={!notesOpen}>
        <button className="ebook-notes-close" type="button" aria-label={t.closeNotes} onClick={() => setNotesOpen(false)}><X size={19} /></button>
        <div className="annotation-panel-heading"><div><span className="eyebrow">{t.yourNotes}</span><h2>{t.marksAndNotes}</h2></div><span className="badge outline">{annotations.length}</span></div>
        {selection && <div className="ebook-selection-card"><small>{t.selected}</small><blockquote>{selection.text}</blockquote>{mode === "note" && <label className="field"><span>{t.noteFor}</span><textarea rows={3} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={t.notePlaceholder} /></label>}{mode === "read" ? <p>{t.chooseTool}</p> : <button className="primary" type="button" disabled={saveAnnotation.isPending || (mode === "note" && !noteText.trim())} onClick={() => saveSelected(mode === "note" ? "NOTE" : mode === "underline" ? "UNDERLINE" : "HIGHLIGHT")}>{saveAnnotation.isPending ? t.saving : mode === "note" ? t.saveNote : mode === "underline" ? t.underlineThis : t.highlightThis}</button>}</div>}
        <ErrorBox error={annotationsQuery.error || saveAnnotation.error || updateAnnotation.error || deleteAnnotation.error} />
        {annotationsQuery.isLoading ? <p className="muted">{t.loadingNotes}</p> : annotations.length === 0 ? <p className="muted">{t.noNotes}</p> : <div className="ebook-annotation-list">{annotations.map((annotation) => <article className={`ebook-annotation-item ${annotation.kind.toLowerCase()}`} key={annotation.id}>
          <button className="annotation-quote" type="button" onClick={() => goToPage(annotation.pageNumber)}><small>{t.pageCaps(annotation.pageNumber)} · {annotation.kind === "HIGHLIGHT" ? t.kindHighlight : annotation.kind === "UNDERLINE" ? t.kindUnderline : t.kindNote}</small><span>{annotation.selectedText}</span></button>
          {editId === annotation.id ? <div className="annotation-edit"><textarea rows={3} value={editText} onChange={(event) => setEditText(event.target.value)} /><button type="button" className="primary" disabled={!editText.trim() || updateAnnotation.isPending} onClick={() => updateAnnotation.mutate({ id: annotation.id, noteText: editText.trim() })}>{t.save}</button><button type="button" className="text-button" onClick={() => setEditId(null)}>{t.cancel}</button></div> : annotation.noteText && <p>{annotation.noteText}</p>}
          {annotation.kind === "NOTE" && editId !== annotation.id && <button type="button" className="text-button" onClick={() => { setEditId(annotation.id); setEditText(annotation.noteText ?? ""); }}>{t.editNote}</button>}
          <button type="button" className="text-button" disabled={deleteAnnotation.isPending} onClick={() => deleteAnnotation.mutate(annotation.id)}>{t.delete}</button>
        </article>)}</div>}
        {annotationsQuery.hasNextPage && <button className="secondary" type="button" disabled={annotationsQuery.isFetchingNextPage} onClick={() => annotationsQuery.fetchNextPage()}>{annotationsQuery.isFetchingNextPage ? t.loading : t.olderNotes}</button>}
        <p className="tiny muted">{t.privacy}</p>
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
