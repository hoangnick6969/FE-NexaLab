import { useEffect, useRef, useState } from "react";
import type { PDFDataRangeTransport, PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { BookOpen, LoaderCircle, RotateCcw, X } from "lucide-react";
import { fetchAssetVersionRange, getAssetAccess, type AssetAccess } from "../../lib/api";

const RANGE_CHUNK_SIZE = 1_048_576;

type Props = {
  assetVersionId: string;
  initialPage: number;
  sourceDigest: string;
  onClose: () => void;
};

export default function SourcePdfViewer({ assetVersionId, initialPage, sourceDigest, onClose }: Props) {
  const [pdfjs, setPdfjs] = useState<typeof import("pdfjs-dist") | null>(null);
  const [access, setAccess] = useState<AssetAccess | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [accessAttempt, setAccessAttempt] = useState(0);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [hostWidth, setHostWidth] = useState(680);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const [ready, setReady] = useState(false);
  const refreshedSignedUrl = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    void import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc = workerUrl;
      if (active) setPdfjs(module);
    }).catch(() => {
      if (active) setLoadError("Không thể khởi động trình đọc PDF.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const opener = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    const media = window.matchMedia("(max-width: 760px)");
    const updateMobile = () => setIsMobile(media.matches);
    media.addEventListener("change", updateMobile);
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (isMobile && event.key === "Tab") {
        const dialog = hostRef.current?.closest(".source-pdf-viewer");
        const focusable = dialog?.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex='-1'])");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => { media.removeEventListener("change", updateMobile); window.removeEventListener("keydown", closeOnEscape); opener?.focus(); };
  }, [isMobile, onClose]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => setHostWidth(Math.max(280, entry.contentRect.width || 680)));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    setAccess(null);
    setDocument(null);
    setReady(false);
    setLoadError("");
    void getAssetAccess(assetVersionId).then((next) => {
      if (active) setAccess(next);
    }).catch(() => {
      if (active) setLoadError("Trang nguồn hiện không khả dụng. Em vẫn có thể tiếp tục đọc bài học.");
    });
    return () => { active = false; };
  }, [assetVersionId, accessAttempt]);

  useEffect(() => {
    if (!pdfjs || !access) return;
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    let rangeTransport: PDFDataRangeTransport | undefined;
    const controllers = new Set<AbortController>();
    const initialController = new AbortController();
    const initialTimeout = window.setTimeout(() => { initialController.abort(); void task?.destroy(); }, 20_000);
    setLoadError("");
    setDocument(null);
    setReady(false);

    const fail = () => {
      if (!active) return;
      if (!refreshedSignedUrl.current) {
        refreshedSignedUrl.current = true;
        setAccessAttempt((value) => value + 1);
        return;
      }
      setLoadError("Trang nguồn hiện không khả dụng. Em vẫn có thể tiếp tục đọc bài học.");
    };

    void (async () => {
      try {
        const length = access.bytes;
        if (typeof length !== "number" || !Number.isSafeInteger(length) || length <= 0) throw new Error("range metadata unavailable");
        const firstEnd = Math.min(length, RANGE_CHUNK_SIZE) - 1;
        const first = await fetchAssetVersionRange(assetVersionId, `bytes=0-${firstEnd}`, initialController.signal);
        if (first.status !== 206) throw new Error("range response unavailable");
        const initialData = new Uint8Array(await first.arrayBuffer());
        if (!active) return;
        rangeTransport = new pdfjs.PDFDataRangeTransport(length, initialData);
        rangeTransport.requestDataRange = (begin, end) => {
          const controller = new AbortController();
          let timedOut = false;
          const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 20_000);
          controllers.add(controller);
          void fetchAssetVersionRange(assetVersionId, `bytes=${begin}-${end - 1}`, controller.signal)
            .then(async (response) => {
              if (response.status !== 206) throw new Error("partial content unavailable");
              return new Uint8Array(await response.arrayBuffer());
            })
            .then((data) => { if (active) rangeTransport?.onDataRange(begin, data); })
            .catch((error: unknown) => {
              if (active && (timedOut || !(error instanceof Error && error.name === "AbortError"))) {
                void task?.destroy();
                fail();
              }
            })
            .finally(() => { window.clearTimeout(timeout); controllers.delete(controller); });
        };
        rangeTransport.abort = () => { controllers.forEach((controller) => controller.abort()); controllers.clear(); };
        task = pdfjs.getDocument({ range: rangeTransport, rangeChunkSize: RANGE_CHUNK_SIZE, disableStream: true, disableAutoFetch: true });
        const loaded = await task.promise;
        window.clearTimeout(initialTimeout);
        if (!active) return;
        if (!Number.isInteger(initialPage) || initialPage < 1 || initialPage > loaded.numPages) {
          await task?.destroy();
          setLoadError("Trang nguồn không tồn tại trong tài liệu này. Không có trang thay thế được chọn.");
          return;
        }
        setDocument(loaded);
      } catch (error) {
        if (active && !(error instanceof Error && error.name === "AbortError")) fail();
        else if (active && initialController.signal.aborted) fail();
        window.clearTimeout(initialTimeout);
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(initialTimeout);
      initialController.abort();
      rangeTransport?.abort();
      void task?.destroy();
    };
  }, [access, assetVersionId, initialPage, pdfjs]);

  useEffect(() => {
    if (!document) return;
    let active = true;
    let renderTask: RenderTask | undefined;
    setRenderError("");
    setReady(false);
    void document.getPage(initialPage).then((page) => {
      if (!active) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(1.6, Math.max(0.5, (hostWidth - 32) / baseViewport.width)) });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) throw new Error("canvas unavailable");
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport, ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }) });
      return renderTask.promise;
    }).then(() => { if (active) setReady(true); }).catch((error: unknown) => {
      if (active && !(error instanceof Error && error.name === "RenderingCancelledException")) setRenderError("Không thể hiển thị trang nguồn này.");
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, hostWidth, initialPage, renderAttempt]);

  const retry = () => {
    refreshedSignedUrl.current = false;
    setLoadError("");
    setRenderError("");
    setRenderAttempt((value) => value + 1);
    setAccessAttempt((value) => value + 1);
  };

  return <aside className="source-pdf-viewer" role="dialog" aria-modal={isMobile || undefined} aria-label="Nguồn sách giáo khoa" data-source-digest={sourceDigest} data-page={initialPage}>
    <header className="source-pdf-header">
      <div><span className="eyebrow">Nguồn sách giáo khoa</span><h2 id="source-pdf-title">Trang PDF {initialPage}</h2></div>
      <button ref={closeRef} type="button" className="source-pdf-close" aria-label="Đóng sách giáo khoa" onClick={onClose}><X size={20} /></button>
    </header>
    <div ref={hostRef} className="source-pdf-viewport">
      {!document && !loadError && <div className="source-pdf-status" role="status"><LoaderCircle className="spin" /><span>Đang tải đúng trang nguồn…</span></div>}
      {(loadError || renderError) && <div className="source-pdf-error" role="alert"><BookOpen size={28} /><p>{loadError || renderError}</p><button type="button" className="secondary" onClick={retry}><RotateCcw size={16} /> Thử lại</button></div>}
      <canvas ref={canvasRef} aria-label={`Trang PDF ${initialPage}`} hidden={!ready || Boolean(renderError)} />
    </div>
    <footer>Trang vật lý {initialPage} · tài liệu được cấp quyền tạm thời</footer>
  </aside>;
}
