import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { LoaderCircle } from "lucide-react";
import { t } from "./ebookText";

/** The second page of a two-page spread; clicking it makes it the active (annotatable) page. */
export function EbookCompanionPage({ document, pageNumber, zoom, onActivate }: { document: PDFDocumentProxy; pageNumber: number; zoom: number; onActivate: () => void }) {
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
