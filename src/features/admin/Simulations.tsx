import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isApiError } from "../../lib/api";
import { ErrorBox, Field, Modal, useAction } from "../../components/ui";
import { QueryState, ReasonDialog, Status, VERDICT_LABEL } from "./admin-ui";

// ───────────────────────── simulations ─────────────────────────
export function Simulations() {
  const labs = useQuery({ queryKey: ["admin", "labs"], queryFn: () => api("/admin/labs") });
  const [labId, setLabId] = useState<string | null>(null);
  return (
    <section className="panel table-wrap">
      <h2>Phòng thực hành và cấu hình mô phỏng</h2>
      <p className="tiny muted">
        Cấu hình là bất biến: mỗi thay đổi tạo một phiên bản mới, chỉ áp dụng cho lần thực hành sau khi kích hoạt. Lần thực hành cũ giữ
        nguyên phiên bản đã dùng. Khoảng tham số vẫn chờ duyệt khoa học (Q-C2-04).
      </p>
      <QueryState query={labs} empty={labs.data?.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Trạng thái</th>
              <th>Mô hình</th>
              <th>Cấu hình đang dùng</th>
              <th>Thao tác</th>
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
                <td>{lab.activeVersion ? `Phiên bản ${lab.activeVersion.version}` : "Mặc định của mô hình"}</td>
                <td>
                  <button type="button" className="text-button" onClick={() => setLabId(lab.id)}>
                    Quản lý phiên bản
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
    <Modal title="Phiên bản cấu hình mô phỏng" onClose={onClose}>
      <QueryState query={q}>
        {d && (
          <div className="admin-detail">
            <h3>{d.lab.title}</h3>
            <table>
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th>Trạng thái</th>
                  <th>Tham số</th>
                  <th>Lần thực hành dùng</th>
                  <th>Lý do</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {d.versions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Chưa có phiên bản; đang dùng mặc định của mô hình.
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
                          Kích hoạt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {model && challenge ? (
              <form onSubmit={submit} className="admin-version-form" aria-label="Tạo phiên bản mới">
                <h3>Tạo phiên bản nháp cho {challenge.id}</h3>
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
                        <option value="">— Mặc định —</option>
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
                  <legend>Ca mẫu: kết quả mong đợi do người duyệt chuyên môn nêu</legend>
                  {d.templates.map((t: any, i: number) => (
                    <label className="admin-resolution" key={t.label}>
                      <span>{t.label}</span>
                      <select
                        aria-label={`Kết quả mong đợi: ${t.label}`}
                        value={golden[i] ?? ""}
                        onChange={(e) => setGolden({ ...golden, [i]: e.target.value })}
                      >
                        <option value="">Không dùng</option>
                        <option value="passed">Đạt</option>
                        <option value="partial">Đạt một phần</option>
                        <option value="needs_practice">Cần luyện thêm</option>
                      </select>
                    </label>
                  ))}
                </fieldset>
                <label className="field">
                  <span>Lý do thay đổi</span>
                  <textarea required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                {goldenErrors.length > 0 && (
                  <ul className="error" role="alert">
                    {goldenErrors
                      .filter((g: any) => !g.ok)
                      .map((g: any) => (
                        <li key={g.label}>
                          {g.label}: mong đợi {VERDICT_LABEL[g.expected]}, máy chủ cho {VERDICT_LABEL[g.actual] ?? g.actual}
                        </li>
                      ))}
                  </ul>
                )}
                {!goldenErrors.length && <ErrorBox error={!activating ? act.error : null} />}
                {created && (
                  <p className="notice" role="status">
                    Đã lưu phiên bản nháp {created.version}; mọi ca mẫu khớp. Kích hoạt để áp dụng cho lần thực hành sau.
                  </p>
                )}
                <button className="primary" disabled={act.isPending}>
                  Kiểm tra ca mẫu và lưu nháp
                </button>
              </form>
            ) : (
              <p className="muted">Mô hình này chưa có tham số được phép điều chỉnh.</p>
            )}
          </div>
        )}
      </QueryState>
      {activating && (
        <ReasonDialog
          title={`Kích hoạt phiên bản ${activating.version}`}
          effect="Từ bây giờ mọi lần thực hành mới của phòng này dùng phiên bản này. Phiên bản đang dùng chuyển sang “đã thay thế”; lần thực hành cũ vẫn giữ cách chấm ban đầu."
          confirmLabel="Kích hoạt"
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
