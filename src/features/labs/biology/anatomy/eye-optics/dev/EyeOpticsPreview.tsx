import { useEffect, useState } from "react";
import "../eye-optics.css";
import { EyeOpticsActivity } from "../EyeOpticsActivity";
import { EyeOpticsResult } from "../EyeOpticsResult";
import { defaultEyeOpticsEvidence, eyeOpticsEvidenceReady, type EyeOpticsEvidence } from "../eye-optics-evidence";

type ServerResult = { result: unknown; verdict: string };

/**
 * Dev-only preview of the FL-16 activity with no server run. Mounted under
 * /dev/lab-kits/eye-optics. "Submit" freezes the evidence payload into the page;
 * a test (or a developer) grades it with the real server rubric and hands the
 * stored result back through window.__eyeOpticsPreview.showResult.
 */
export default function EyeOpticsPreview() {
  const [state, setState] = useState<EyeOpticsEvidence>(defaultEyeOpticsEvidence);
  const [submitted, setSubmitted] = useState<EyeOpticsEvidence | null>(null);
  const [server, setServer] = useState<ServerResult | null>(null);

  useEffect(() => {
    const target = window as unknown as { __eyeOpticsPreview?: { showResult: (result: unknown, verdict: string) => void } };
    target.__eyeOpticsPreview = { showResult: (result, verdict) => setServer({ result, verdict }) };
    return () => { delete target.__eyeOpticsPreview; };
  }, []);

  return (
    <main className="eye-optics-preview">
      <EyeOpticsActivity state={state} onChange={(next) => { setState(next); setServer(null); }} resetKey={0} />
      <div className="eye-optics-preview-submit">
        <button type="button" disabled={!eyeOpticsEvidenceReady(state)} onClick={() => { setSubmitted(state); setServer(null); }}>
          Nộp bài (xem trước, không có máy chủ)
        </button>
      </div>
      {submitted && (
        <details>
          <summary>Bằng chứng sẽ gửi máy chủ</summary>
          <pre data-testid="eye-optics-evidence">{JSON.stringify(submitted, null, 2)}</pre>
        </details>
      )}
      {server && <EyeOpticsResult result={server.result} verdict={server.verdict} />}
    </main>
  );
}
