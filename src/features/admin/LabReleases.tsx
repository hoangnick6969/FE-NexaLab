import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

type Release = { id: string; version: number; status: string; digest: string; snapshot: { reviewPolicy?: string; requiredReviewKinds?: string[] } };

export function LabReleases() {
  const client = useQueryClient();
  const labs = useQuery({ queryKey: ["admin", "labs"], queryFn: () => api<Array<{ id: string; title: string }>>("/admin/labs") });
  const [labId, setLabId] = useState("");
  const releases = useQuery({ queryKey: ["admin", "lab-releases", labId], enabled: Boolean(labId), queryFn: () => api<Release[]>(`/admin/labs/${labId}/releases`) });
  const [selected, setSelected] = useState<Release | null>(null);
  const [digest, setDigest] = useState("");
  const [developerCheck, setDeveloperCheck] = useState("");
  const [agentCheck, setAgentCheck] = useState("");
  const [ownerEvidence, setOwnerEvidence] = useState({ curriculumMapping: "", sourceReferences: "", scientificGoldenCases: "", rubric: "", safetyAssessment: "", rightsAssessment: "" });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    if (!selected || digest !== selected.digest) return;
    setBusy(true);
    setError("");
    try {
      const evidence = selected.snapshot.reviewPolicy === "OWNER_SIGNOFF_V1"
        ? { ...ownerEvidence, sourceReferences: ownerEvidence.sourceReferences.split("\n").map(value => value.trim()).filter(Boolean) }
        : { developerCheck, agentCheck };
      await api(`/admin/labs/${labId}/releases/${selected.id}/publish`, "POST", { reason, releaseDigest: digest, evidence });
      await client.invalidateQueries({ queryKey: ["admin", "lab-releases", labId] });
      await client.invalidateQueries({ queryKey: ["admin", "labs"] });
      setSelected(null);
      setDigest(""); setDeveloperCheck(""); setAgentCheck(""); setReason("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể phê duyệt release."); }
    finally { setBusy(false); }
  }

  return <section className="panel">
    <h2>Duyệt phát hành Lab</h2>
    <p>Kiểm tra bản nháp và nhập lại đúng digest. Bằng chứng cần ghi phụ thuộc policy được lưu trong từng release.</p>
    <label>Phòng thực hành
      <select value={labId} onChange={(event) => { setLabId(event.target.value); setSelected(null); }}>
        <option value="">Chọn phòng</option>
        {(labs.data ?? []).map((lab) => <option key={lab.id} value={lab.id}>{lab.title} ({lab.id})</option>)}
      </select>
    </label>
    {labs.error && <p role="alert">Không tải được danh sách Lab.</p>}
    {releases.error && <p role="alert">Không tải được release.</p>}
    {labId && <ul>{(releases.data ?? []).map((release) => <li key={release.id}>
      v{release.version} · {release.status} · <code>{release.digest}</code>
      {release.status === "DRAFT" && ["DEV_APPROVAL_V1", "OWNER_SIGNOFF_V1"].includes(release.snapshot?.reviewPolicy ?? "") && <button type="button" onClick={() => { setSelected(release); setDigest(""); }}>Duyệt bản này</button>}
    </li>)}</ul>}
    {selected && <div>
      <h3>Duyệt v{selected.version}</h3>
      <p>Digest cần xác nhận: <code>{selected.digest}</code></p>
      <label>Nhập lại digest <input value={digest} onChange={(event) => setDigest(event.target.value.trim())} /></label>
      {selected.snapshot.reviewPolicy === "OWNER_SIGNOFF_V1" ? <>
        {(["curriculumMapping", "sourceReferences", "scientificGoldenCases", "rubric", "safetyAssessment", "rightsAssessment"] as const).map(field => <label key={field}>{({ curriculumMapping: "Mapping chương trình", sourceReferences: "Nguồn tham chiếu (mỗi dòng một nguồn)", scientificGoldenCases: "Ca khoa học chuẩn", rubric: "Rubric", safetyAssessment: "Đánh giá an toàn", rightsAssessment: "Quyền sử dụng" })[field]}<textarea value={ownerEvidence[field]} onChange={event => setOwnerEvidence(previous => ({ ...previous, [field]: event.target.value }))} /></label>)}
      </> : <><label>Dev đã kiểm tra <textarea value={developerCheck} onChange={(event) => setDeveloperCheck(event.target.value)} /></label><label>Agent đã kiểm tra <textarea value={agentCheck} onChange={(event) => setAgentCheck(event.target.value)} /></label></>}
      <label>Lý do phê duyệt <textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={busy || digest !== selected.digest || reason.trim().length < 5 || (selected.snapshot.reviewPolicy === "OWNER_SIGNOFF_V1" ? Object.values(ownerEvidence).some(value => value.trim().length < 10) : developerCheck.trim().length < 10 || agentCheck.trim().length < 10)} onClick={approve}>Phê duyệt và phát hành</button>
      <button type="button" onClick={() => setSelected(null)}>Hủy</button>
    </div>}
  </section>;
}
