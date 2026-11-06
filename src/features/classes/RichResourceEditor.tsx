import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { UploadCloud, Loader2, CheckCircle2, Eye, Download, FileText, ExternalLink } from "lucide-react";
import { api, streamMaterial, uploadFile } from "../../lib/api";
import { useActionToast } from "../../components/ActionToasts";
import { ErrorBox, Field } from "../../components/ui";
import { labInfo } from "../labs/lab-info";
import "./class-resource-preview.css";
import { richResourceText } from "./rich-resource-text";

export function cleanFileName(name?: string): string {
  if (!name) return "";
  try {
    const bytes = new Uint8Array([...name].map((c) => c.charCodeAt(0)));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (decoded && !decoded.includes("\ufffd") && decoded !== name) return decoded;
  } catch {}
  return name.replace(/\ufffd/g, "");
}

export type ResourceKind = "DECK" | "STUDY_QUIZ" | "TEST" | "LAB" | "DOCUMENT" | "REPORT_TEMPLATE" | "LINK";
export const richNames = richResourceText().names;
export const richSamples = {
  LAB: { source: { labId: "", releaseId: "", challengeId: "" }, learningObjective: "", instructions: "", reportPrompts: [] },
  DOCUMENT: { description: "", source: { type: "upload", assetVersionId: "" } },
  REPORT_TEMPLATE: { description: "", source: { type: "upload", assetVersionId: "" } },
  LINK: { url: "", description: "" },
};

export function RichResourceEditor({ kind, value, onChange, classId }: { kind: ResourceKind; value: any; onChange: (value: any) => void; classId?: string }) {
  const t = richResourceText();
  const toast = useActionToast();
  const labs = useQuery<{ labs: any[] }>({ queryKey: ["class-resource-lessons", classId], queryFn: () => api(`/classes/${classId}/assignable-content`), enabled: kind === "LAB" && Boolean(classId) });
  const [error, setError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const generation = useRef(0);
  const mounted = useRef(false);
  const sourceIdentity = JSON.stringify([kind, classId, value.source]);
  const previousSource = useRef(sourceIdentity);
  if (previousSource.current !== sourceIdentity) { previousSource.current = sourceIdentity; generation.current++; }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  useEffect(() => { setUploading(false); setError(null); }, [sourceIdentity]);
  const upload = async (file: File) => {
    const validExts = [".pdf", ".png", ".jpg", ".jpeg", ".mp4"];
    const dot = file.name ? file.name.lastIndexOf(".") : -1;
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
    if (ext && !validExts.includes(ext)) {
      toast({
        title: "Định dạng không được hỗ trợ",
        description: "Hệ thống chỉ nhận tệp PDF, PNG, JPG, JPEG hoặc MP4.",
        tone: "error",
      });
      return;
    }
    if (file.size && file.size > 20 * 1024 * 1024) {
      toast({
        title: "Tệp vượt quá dung lượng",
        description: "Dung lượng tối đa cho phép là 20 MB.",
        tone: "error",
      });
      return;
    }
    const started = ++generation.current;
    setError(null); setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      if (mounted.current && started === generation.current) {
        latest.current.onChange({ ...latest.current.value, source: { type: "upload", assetVersionId: uploaded.id } });
        toast({
          title: "Tải tệp lên thành công",
          description: `Đã lưu "${file.name}" vào hệ thống lưu trữ lớp.`,
          tone: "success",
        });
      }
    } catch (e: any) {
      if (mounted.current && started === generation.current) {
        setError(e);
        toast({
          title: "Tải tệp lên thất bại",
          description: e?.message ?? "Không thể tải tệp lên máy chủ.",
          tone: "error",
        });
      }
    }
    finally { if (mounted.current && started === generation.current) setUploading(false); }
  };
  if (kind === "LAB") {
    const selected = labs.data?.labs.find((lab) => lab.id === value.source?.labId);
    const stale = Boolean(value.source?.releaseId && selected?.release.id !== value.source.releaseId);
    return <div className="rich-resource-editor">
      <p className="notice">{t.customize}</p>
      {labs.isLoading && <p role="status">{t.loadingLabs}</p>}<ErrorBox error={labs.error} />
      <div className="form-grid-2col">
        <label className="field"><span>{t.sourceLab}</span><select required value={value.source?.labId ?? ""} onChange={(event) => { const lab = labs.data?.labs.find((item) => item.id === event.target.value); onChange({ ...value, source: { labId: lab?.id ?? "", releaseId: lab?.release.id ?? "", challengeId: lab?.challenges[0]?.id ?? "" } }); }}><option value="">{t.chooseLab}</option>{labs.data?.labs.map((lab) => <option key={lab.id} value={lab.id}>{lab.title} · Foundational v{lab.release.version}</option>)}</select></label>
        <label className="field"><span>{t.challenge}</span><select required disabled={stale} value={value.source?.challengeId ?? ""} onChange={(event) => onChange({ ...value, source: { ...value.source, challengeId: event.target.value } })}>{stale ? <option value={value.source.challengeId}>{t.pinnedChallenge(value.source.challengeId)}</option> : <><option value="">{t.chooseChallenge}</option>{selected?.challenges.map((challenge: any) => <option key={challenge.id} value={challenge.id}>{challenge.objective}</option>)}</>}</select></label>
      </div>
      {stale && <p className="notice">{t.stale}</p>}
      {stale && selected && <button type="button" className="secondary" onClick={() => onChange({ ...value, source: { labId: selected.id, releaseId: selected.release.id, challengeId: selected.challenges.some((item: any) => item.id === value.source.challengeId) ? value.source.challengeId : selected.challenges[0]?.id ?? "" } })}>{t.upgrade}</button>}
      <Field label={t.objective} required maxLength={1000} value={value.learningObjective ?? ""} onChange={(event) => onChange({ ...value, learningObjective: event.target.value })} />
      <label className="field"><span>{t.instructions}</span><textarea required rows={3} maxLength={10000} value={value.instructions ?? ""} onChange={(event) => onChange({ ...value, instructions: event.target.value })} /></label>
      <label className="field"><span>{t.prompts}</span><textarea rows={2} value={(value.reportPrompts ?? []).join("\n")} onChange={(event) => onChange({ ...value, reportPrompts: event.target.value.split("\n") })} /></label>
      <ResourcePreview kind={kind} content={value} />
    </div>;
  }
  const sourceType = value.source?.type ?? (kind === "LINK" ? "link" : "upload");
  return <div className="rich-resource-editor">
    {kind !== "LINK" && <label className="field"><span>{t.documentSource}</span><select value={sourceType} onChange={(event) => onChange({ description: value.description ?? "", source: event.target.value === "upload" ? { type: "upload", assetVersionId: "" } : { type: "link", url: "" } })}><option value="upload">{t.uploadSource}</option><option value="link">{t.linkSource}</option></select></label>}
    <p className="tiny muted">{t.uploadHelp}</p>
    {kind === "LINK" || sourceType === "link" ? (
      <Field label={t.url} type="url" required maxLength={2048} value={kind === "LINK" ? value.url ?? "" : value.source?.url ?? ""} onChange={(event) => onChange(kind === "LINK" ? { ...value, url: event.target.value } : { ...value, source: { type: "link", url: event.target.value } })} />
    ) : (
      <div
        className={`file-dropzone${isDragging ? " is-dragging" : ""}${uploading ? " is-uploading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !uploading) void upload(file);
        }}
      >
        <label className="field dropzone-label">
          <span>{t.checkedFile}</span>
          <div className="dropzone-box">
            {uploading ? (
              <>
                <Loader2 size={26} className="dropzone-icon dropzone-spinner" aria-hidden="true" />
                <div className="dropzone-text">
                  <span className="dropzone-title">Đang tải tệp lên hệ thống lưu trữ...</span>
                  <span className="dropzone-hint">Vui lòng đợi giây lát</span>
                </div>
              </>
            ) : value.source?.assetVersionId ? (
              <>
                <CheckCircle2 size={26} className="dropzone-icon text-success" aria-hidden="true" />
                <div className="dropzone-text">
                  <span className="dropzone-title">Tệp đã sẵn sàng trong kho lưu trữ</span>
                  <span className="dropzone-hint">Kéo thả tệp khác hoặc nhấn để thay thế</span>
                </div>
              </>
            ) : (
              <>
                <UploadCloud size={26} className="dropzone-icon" aria-hidden="true" />
                <div className="dropzone-text">
                  <span className="dropzone-title">Kéo thả tệp vào đây hoặc nhấn để chọn</span>
                  <span className="dropzone-hint">Hỗ trợ PDF, PNG, JPG, MP4 (tối đa 20 MB)</span>
                </div>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.mp4"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </div>
          {uploading && <small role="status">{t.uploading}</small>}
          {value.source?.assetVersionId && <small className="file-ready-text">{t.fileReady}</small>}
        </label>
      </div>
    )}
    <label className="field"><span>{t.description}</span><textarea rows={2} maxLength={10000} value={value.description ?? ""} onChange={(event) => onChange({ ...value, description: event.target.value })} /></label>
    <ErrorBox error={error} /><ResourcePreview kind={kind} content={value} />
  </div>;
}

export function ResourcePreview({ kind, content, resourceId, classId, student = false, attachment }: { kind: ResourceKind; content: any; resourceId?: string; classId?: string; student?: boolean; attachment?: { fileName: string; mime: string; bytes: number | null; status: string } | null }) {
  const t = richResourceText();
  const [error, setError] = useState<unknown>(null);
  if (kind === "LAB") {
    const lab = labInfo.find((entry) => entry.id === content.source?.labId);
    const query = new URLSearchParams({ ...(resourceId && classId ? { resourceId, classId } : {}), challengeId: content.source?.challengeId ?? "" });
    return <section className="resource-preview"><h4>{student ? t.classActivity : t.previewActivity}</h4>{lab?.thumbnail && <img className="resource-lab-thumbnail" src={lab.thumbnail} alt={lab.title} />}<p className="tiny muted">{t.source}: {lab?.title ?? content.source?.labId} · {content.source?.challengeId}</p><b>{t.teacherObjective}</b><p>{content.learningObjective}</p><b>{t.teacherInstructions}</b><p className="resource-plain-text">{content.instructions}</p>{content.reportPrompts?.length > 0 && <ol>{content.reportPrompts.map((prompt: string, i: number) => <li key={i}>{prompt}</li>)}</ol>}<p className="tiny muted">{t.practiceHelp}</p>{resourceId && classId && <Link className="secondary" to={`/labs/${encodeURIComponent(content.source.labId)}?${query}`}>{student ? t.openPractice : t.previewSource}</Link>}</section>;
  }
  let url = kind === "LINK" ? content.url : content.source?.url;
  try { const parsed = new URL(url); if (parsed.protocol !== "https:" || parsed.username || parsed.password) url = undefined; } catch { url = undefined; }

  const friendlySize = attachment?.bytes
    ? attachment.bytes >= 1024 * 1024
      ? `${(attachment.bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(attachment.bytes / 1024)} KB`
    : "";

  return (
    <section className="resource-preview compact-resource-preview">
      {!student && <h4>{t.sourcePreview}</h4>}
      {attachment && (
        <div className="compact-attachment-card">
          <div className="compact-attachment-badge">
            <FileText size={22} aria-hidden="true" />
            <span className="compact-badge-ext">
              {attachment.mime?.includes("pdf") ? "PDF" : attachment.mime?.includes("video") ? "VIDEO" : "TỆP"}
            </span>
          </div>
          <div className="compact-attachment-body">
            <div className="compact-attachment-filename" title={cleanFileName(attachment.fileName)}>
              {cleanFileName(attachment.fileName)}
            </div>
            <div className="compact-attachment-meta">
              <span>{attachment.mime}</span>
              {friendlySize && <span>· {friendlySize}</span>}
              <span className="compact-status-ready">READY</span>
            </div>
          </div>
        </div>
      )}
      {content.description && <p className="resource-plain-text">{content.description}</p>}
      <div className="compact-action-row">
        {url && /^https:\/\//i.test(url) && (
          <a className="secondary button-compact" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden="true" />
            <span>{t.openExternal}</span>
          </a>
        )}
        {content.source?.type === "upload" && content.source.assetVersionId && (
          <>
            <button
              type="button"
              className="secondary button-compact"
              onClick={async () => {
                const opened = window.open("about:blank", "_blank");
                if (!opened) {
                  setError(new Error(t.popupBlocked));
                  return;
                }
                opened.opener = null;
                try {
                  const access = await streamMaterial(`assetv:${content.source.assetVersionId}`);
                  if (opened) opened.location.href = access.src;
                } catch (e) {
                  opened?.close();
                  setError(e);
                }
              }}
            >
              <Eye size={14} aria-hidden="true" />
              <span>{t.openFile}</span>
            </button>
            <button
              type="button"
              className="secondary button-compact"
              onClick={async () => {
                try {
                  const access = await streamMaterial(`assetv:${content.source.assetVersionId}`);
                  const link = document.createElement("a");
                  link.href = access.src;
                  link.download = cleanFileName(attachment?.fileName) || "document";
                  link.target = "_blank";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {
                  setError(e);
                }
              }}
            >
              <Download size={14} aria-hidden="true" />
              <span>Tải xuống</span>
            </button>
          </>
        )}
      </div>
      <ErrorBox error={error} />
    </section>
  );
}
