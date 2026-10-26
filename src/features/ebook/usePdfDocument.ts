import { useEffect, useRef, useState } from "react";
import type { PDFDataRangeTransport, PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { t } from "./ebookText";

/**
 * Loads pdf.js on demand, then the book: HTTP range requests (256 KB chunks) when storage supports them,
 * otherwise a plain URL load. `onPageChange` gets 1 when a load starts and the clamped start page when it ends.
 */
export function usePdfDocument(url: string | null | undefined, initialPage: number | undefined, onPageChange: (page: number) => void) {
  const [pdfjs, setPdfjs] = useState<typeof import("pdfjs-dist") | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fingerprint, setFingerprint] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const onPage = useRef(onPageChange);
  onPage.current = onPageChange;

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
    setLoadError(""); setDocument(null); setFingerprint(""); onPage.current(1); setPageCount(0);
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
        const initial = Number.isInteger(initialPage) ? initialPage! : 1;
        const startPage = Math.min(loaded.numPages, Math.max(1, initial));
        setDocument(loaded); setPageCount(loaded.numPages); onPage.current(startPage);
        setFingerprint(loaded.fingerprints.find((value): value is string => Boolean(value)) ?? "");
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : t.ebookFailed);
      }
    };
    void load();
    return () => { active = false; loadController.abort(); rangeTransport?.abort(); void task?.destroy(); };
  }, [pdfjs, url, reloadKey, initialPage]);

  return { pdfjs, document, pageCount, fingerprint, loadError, reload: () => setReloadKey((value) => value + 1) };
}
