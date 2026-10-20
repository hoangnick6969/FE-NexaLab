import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isApiError } from "../../lib/api";
import { ErrorBox, Field, Modal, useAction } from "../../components/ui";
import { QueryState, ReasonDialog, Status, VERDICT_LABEL } from "./admin-ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    title: "Phòng thực hành và cấu hình mô phỏng",
    note: "Cấu hình là bất biến: mỗi thay đổi tạo một phiên bản mới, chỉ áp dụng cho lần thực hành sau khi kích hoạt. Lần thực hành cũ giữ nguyên phiên bản đã dùng. Khoảng tham số vẫn chờ duyệt khoa học (Q-C2-04).",
    lab: "Phòng",
    status: "Trạng thái",
    model: "Mô hình",
    activeConfig: "Cấu hình đang dùng",
    actions: "Thao tác",
    version: (v: number | string) => `Phiên bản ${v}`,
    modelDefault: "Mặc định của mô hình",
    manageVersions: "Quản lý phiên bản",
    versionsTitle: "Phiên bản cấu hình mô phỏng",
    versionHead: "Phiên bản",
    params: "Tham số",
    attemptsUsing: "Lần thực hành dùng",
    reason: "Lý do",
    noVersions: "Chưa có phiên bản; đang dùng mặc định của mô hình.",
    activate: "Kích hoạt",
    newVersion: "Tạo phiên bản mới",
    draftFor: (id: string) => `Tạo phiên bản nháp cho ${id}`,
    default: "— Mặc định —",
    golden: "Ca mẫu: kết quả mong đợi do người duyệt chuyên môn nêu",
    expectedFor: (label: string) => `Kết quả mong đợi: ${label}`,
    unused: "Không dùng",
    passed: "Đạt",
    partial: "Đạt một phần",
    needsPractice: "Cần luyện thêm",
    changeReason: "Lý do thay đổi",
    mismatch: (label: string, expected: string, actual: string) => `${label}: mong đợi ${expected}, máy chủ cho ${actual}`,
    draftSaved: (v: number | string) => `Đã lưu phiên bản nháp ${v}; mọi ca mẫu khớp. Kích hoạt để áp dụng cho lần thực hành sau.`,
    checkSave: "Kiểm tra ca mẫu và lưu nháp",
    noParams: "Mô hình này chưa có tham số được phép điều chỉnh.",
    activateVersion: (v: number | string) => `Kích hoạt phiên bản ${v}`,
    activateEffect: "Từ bây giờ mọi lần thực hành mới của phòng này dùng phiên bản này. Phiên bản đang dùng chuyển sang “đã thay thế”; lần thực hành cũ vẫn giữ cách chấm ban đầu.",
  },
  en: {
    title: "Labs and simulation configuration",
    note: "Configuration is immutable: each change creates a new version, used only for practice after activation. Earlier attempts keep the version they used. Parameter ranges still await scientific review (Q-C2-04).",
    lab: "Lab",
    status: "Status",
    model: "Model",
    activeConfig: "Active configuration",
    actions: "Actions",
    version: (v: number | string) => `Version ${v}`,
    modelDefault: "Model default",
    manageVersions: "Manage versions",
    versionsTitle: "Simulation configuration versions",
    versionHead: "Version",
    params: "Parameters",
    attemptsUsing: "Attempts using it",
    reason: "Reason",
    noVersions: "No versions yet; the model default is in use.",
    activate: "Activate",
    newVersion: "Create a new version",
    draftFor: (id: string) => `Create a draft version for ${id}`,
    default: "— Default —",
    golden: "Reference cases: expected results set by the subject reviewer",
    expectedFor: (label: string) => `Expected result: ${label}`,
    unused: "Not used",
    passed: "Passed",
    partial: "Partly passed",
    needsPractice: "Needs more practice",
    changeReason: "Reason for the change",
    mismatch: (label: string, expected: string, actual: string) => `${label}: expected ${expected}, server gave ${actual}`,
    draftSaved: (v: number | string) => `Draft version ${v} saved; every reference case matches. Activate it to use it for later practice.`,
    checkSave: "Check reference cases and save draft",
    noParams: "This model has no adjustable parameters yet.",
    activateVersion: (v: number | string) => `Activate version ${v}`,
    activateEffect: "From now on every new attempt in this lab uses this version. The current version becomes “superseded”; earlier attempts keep their original scoring.",
  },
});
const tx = text();

// ───────────────────────── simulations ─────────────────────────
export function Simulations() {
  const labs = useQuery({ queryKey: ["admin", "labs"], queryFn: () => api("/admin/labs") });
  const [labId, setLabId] = useState<string | null>(null);
  return (
    <section className="panel table-wrap">
      <h2>{tx.title}</h2>
      <p className="tiny muted">
        {tx.note}
      </p>
      <QueryState query={labs} empty={labs.data?.length === 0}>
        <table>
          <thead>
            <tr>
              <th>{tx.lab}</th>
              <th>{tx.status}</th>
              <th>{tx.model}</th>
              <th>{tx.activeConfig}</th>
              <th>{tx.actions}</th>
            </tr>
          </thead>
          <tbody>
            {(labs.data ?? []).map((lab: any) => (
              <tr key={lab.id}>
                <td>{lab.title}</td>
                <td>
                  <Status value={lab.status} />
                </td>
                <td>
                  {lab.model?.modelRef ?? lab.simulationModelRef} · engine {lab.engineVersion}
                </td>
                <td>{lab.activeVersion ? tx.version(lab.activeVersion.version) : tx.modelDefault}</td>
                <td>
                  <button type="button" className="text-button" onClick={() => setLabId(lab.id)}>
                    {tx.manageVersions}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueryState>
      {labId && <LabVersions labId={labId} onClose={() => setLabId(null)} />}
    </section>
  );
}

function LabVersions({ labId, onClose }: { labId: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["admin", "versions", labId], queryFn: () => api(`/admin/labs/${labId}/versions`) });
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const [params, setParams] = useState<Record<string, Record<string, string>>>({});
  const [golden, setGolden] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [activating, setActivating] = useState<any>(null);
  const [created, setCreated] = useState<any>(null);
  const d = q.data;
  const model = d?.model;
  const challenge = d?.lab.challenges[0];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: Record<string, number | string> = {};
    for (const [name, raw] of Object.entries(params[challenge.id] ?? {})) {
      if (raw === "") continue;
      values[name] = model.params[name].kind === "number" ? Number(raw) : raw;
    }
    const goldenCases = d.templates
      .map((t: any, i: number) =>
        golden[i] ? { challengeId: challenge.id, label: t.label, labState: t.labState, expectedVerdict: golden[i] } : null,
      )
      .filter(Boolean);
    act.mutate(
      { path: `/admin/labs/${labId}/versions`, body: { challengeParams: { [challenge.id]: values }, goldenCases, reason } },
      { onSuccess: setCreated },
    );
  };
  const goldenErrors = isApiError(act.error, "GOLDEN_CASE_MISMATCH") ? ((act.error.details as any)?.golden ?? []) : [];
  return (
    <Modal title={tx.versionsTitle} onClose={onClose}>
      <QueryState query={q}>
        {d && (
          <div className="admin-detail">
            <h3>{d.lab.title}</h3>
            <table>
              <thead>
                <tr>
                  <th>{tx.versionHead}</th>
                  <th>{tx.status}</th>
                  <th>{tx.params}</th>
                  <th>{tx.attemptsUsing}</th>
                  <th>{tx.reason}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {d.versions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      {tx.noVersions}
                    </td>
                  </tr>
                )}
                {d.versions.map((v: any) => (
                  <tr key={v.id}>
                    <td>{v.version}</td>
                    <td>
                      <Status value={v.status} />
                    </td>
                    <td className="tiny">{JSON.stringify(v.challengeParams)}</td>
                    <td>{v.attempts}</td>
                    <td className="tiny">{v.reason}</td>
                    <td>
                      {v.status === "draft" && (
                        <button type="button" className="text-button" onClick={() => setActivating(v)}>
                          {tx.activate}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {model && challenge ? (
              <form onSubmit={submit} className="admin-version-form" aria-label={tx.newVersion}>
                <h3>{tx.draftFor(challenge.id)}</h3>
                {Object.entries(model.params).map(([name, spec]: [string, any]) =>
                  spec.kind === "number" ? (
                    <Field
                      key={name}
                      label={`${spec.label} (${spec.min}–${spec.max} ${spec.unit})`}
                      type="number"
                      min={spec.min}
                      max={spec.max}
                      step={spec.step}
                      value={params[challenge.id]?.[name] ?? ""}
                      onChange={(e) =>
                        setParams({ ...params, [challenge.id]: { ...(params[challenge.id] ?? {}), [name]: e.target.value } })
                      }
                    />
                  ) : (
                    <label className="field" key={name}>
                      <span>{spec.label}</span>
                      <select
                        value={params[challenge.id]?.[name] ?? ""}
                        onChange={(e) =>
                          setParams({ ...params, [challenge.id]: { ...(params[challenge.id] ?? {}), [name]: e.target.value } })
                        }
                      >
                        <option value="">{tx.default}</option>
                        {spec.options.map((o: any) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
                <fieldset>
                  <legend>{tx.golden}</legend>
                  {d.templates.map((t: any, i: number) => (
                    <label className="admin-resolution" key={t.label}>
                      <span>{t.label}</span>
                      <select
                        aria-label={tx.expectedFor(t.label)}
                        value={golden[i] ?? ""}
                        onChange={(e) => setGolden({ ...golden, [i]: e.target.value })}
                      >
                        <option value="">{tx.unused}</option>
                        <option value="passed">{tx.passed}</option>
                        <option value="partial">{tx.partial}</option>
                        <option value="needs_practice">{tx.needsPractice}</option>
                      </select>
                    </label>
                  ))}
                </fieldset>
                <label className="field">
                  <span>{tx.changeReason}</span>
                  <textarea required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                {goldenErrors.length > 0 && (
                  <ul className="error" role="alert">
                    {goldenErrors
                      .filter((g: any) => !g.ok)
                      .map((g: any) => (
                        <li key={g.label}>
                          {tx.mismatch(g.label, VERDICT_LABEL[g.expected], VERDICT_LABEL[g.actual] ?? g.actual)}
                        </li>
                      ))}
                  </ul>
                )}
                {!goldenErrors.length && <ErrorBox error={!activating ? act.error : null} />}
                {created && (
                  <p className="notice" role="status">
                    {tx.draftSaved(created.version)}
                  </p>
                )}
                <button className="primary" disabled={act.isPending}>
                  {tx.checkSave}
                </button>
              </form>
            ) : (
              <p className="muted">{tx.noParams}</p>
            )}
          </div>
        )}
      </QueryState>
      {activating && (
        <ReasonDialog
          title={tx.activateVersion(activating.version)}
          effect={tx.activateEffect}
          confirmLabel={tx.activate}
          pending={act.isPending}
          error={act.error}
          onClose={() => setActivating(null)}
          onSubmit={(why) =>
            act.mutate(
              { path: `/admin/labs/${labId}/versions/${activating.version}/activate`, body: { reason: why } },
              { onSuccess: () => setActivating(null) },
            )
          }
        />
      )}
    </Modal>
  );
}
