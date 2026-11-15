import { useEffect, useRef, useState } from "react";
import type { PDFDataRangeTransport, PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { t } from "./ebookText";

const RANGE_CHUNK_SIZE = 1_048_576;

let pdfjsModulePromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc = workerUrl;
      return module;
    }).catch((error) => {
      pdfjsModulePromise = null;
      throw error;
    });
  }
  return pdfjsModulePromise;
}

/**
 * Loads pdf.js on demand in parallel with the initial HTTP range request (1 MB chunks) when storage supports them,
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
    if (!url) return;
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    let rangeTransport: PDFDataRangeTransport | undefined;
    const rangeControllers = new Set<AbortController>();
    const loadController = new AbortController();
    const initialPageValue = Number.isInteger(initialPage) && initialPage! > 0 ? initialPage! : 1;
    setLoadError(""); setDocument(null); setFingerprint(""); onPage.current(initialPageValue); setPageCount(0);

    const fetchInitialRange = async () => {
      try {
        const firstRange = await fetch(url, {
          headers: { Range: `bytes=0-${RANGE_CHUNK_SIZE - 1}` },
          signal: loadController.signal,
        });
        if (firstRange.status !== 206) {
          await firstRange.body?.cancel();
          return { length: 0, initialData: null as Uint8Array | null };
        }
        const contentRange = firstRange.headers.get("content-range") ?? "";
        const totalMatch = /\/(\d+)\s*$/.exec(contentRange);
        let length = totalMatch ? Number(totalMatch[1]) : 0;
        const initialData = new Uint8Array(await firstRange.arrayBuffer());
        if (!Number.isSafeInteger(length) || length <= 0) {
          try {
            const head = await fetch(url, { method: "HEAD", signal: loadController.signal });
            const headLen = Number(head.headers.get("content-length"));
            if (head.ok && Number.isSafeInteger(headLen) && headLen > 0) length = headLen;
          } catch {
            // Ignore HEAD fallback failure.
          }
        }
        return { length, initialData };
      } catch {
        return { length: 0, initialData: null as Uint8Array | null };
      }
    };

    const load = async () => {
      try {
        const [pdfjsModule, { length, initialData }] = await Promise.all([
          loadPdfjs(),
          fetchInitialRange(),
        ]);
        if (!active) return;
        setPdfjs(pdfjsModule);

        if (length > 0 && initialData) {
          rangeTransport = new pdfjsModule.PDFDataRangeTransport(length, initialData);
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
          task = pdfjsModule.getDocument({ range: rangeTransport, rangeChunkSize: RANGE_CHUNK_SIZE, disableStream: true, disableAutoFetch: true });
        }
        task ??= pdfjsModule.getDocument({ url, withCredentials: false, rangeChunkSize: RANGE_CHUNK_SIZE });
        const loaded = await task.promise;
        if (!active) return;
        const startPage = Math.min(loaded.numPages, Math.max(1, initialPageValue));
        setDocument(loaded); setPageCount(loaded.numPages); onPage.current(startPage);
        setFingerprint(loaded.fingerprints.find((value): value is string => Boolean(value)) ?? "");
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : t.ebookFailed);
      }
    };
    void load();
    return () => { active = false; loadController.abort(); rangeTransport?.abort(); void task?.destroy(); };
  }, [url, reloadKey, initialPage]);

  return { pdfjs, document, pageCount, fingerprint, loadError, reload: () => setReloadKey((value) => value + 1) };
}
