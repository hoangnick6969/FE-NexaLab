import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { Badge, ErrorBox, Modal, useAction, InlineLoader } from "./ui";

/** B1-T4 library contract (GET /teacher/content). */
export type LibraryFilters = { grade: string; domain: string; outcome: string; scope: string };
type Metric = { covered: number; total: number; gaps: string[] } | null;
export type CoverageRow = {
  grade: number;
  domain: string;
  domainLabel: string;
  releasedBaseline: Metric;
  ownPublished: Metric;
  fixture: Metric;
  releasedLessons: number;
};
export type Outcome = { code: string; grade: number; domain: string; chapter: string; statement: string; synthetic: boolean };
type NumberParam = { kind: "number"; label: string; unit: string; min: number; max: number; step: number; default: number };
type ChoiceParam = { kind: "choice"; label: string; options: Array<{ value: string; label: string }>; default: string };
export type Taxonomy = {
  domains: Array<{ id: string; label: string }>;
  challengeParameters: Record<string, { modelRef: string; rangeReview: string; params: Record<string, NumberParam | ChoiceParam> }>;
};
export type Attribution = { sources: string | null; license: string | null; licenseLabel: string | null; synthetic: boolean; note: string | null };

export const libraryQuery = (filters: LibraryFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && value !== "ALL") params.set(key, value);
  const query = params.toString();
  return "/teacher/content" + (query ? "?" + query : "");
};

const metricText = (metric: Metric) => (metric ? `${metric.covered}/${metric.total}` : "Chưa có bản đồ");

export function LibraryFiltersBar({
  filters,
  onChange,
  taxonomy,
  outcomes,
}: {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  taxonomy?: Taxonomy;
  outcomes: Outcome[];
}) {
  const set = (patch: Partial<LibraryFilters>) => onChange({ ...filters, ...patch });
  const visibleOutcomes = outcomes.filter(
    (o) => (!filters.grade || String(o.grade) === filters.grade) && (!filters.domain || o.domain === filters.domain),
  );
  return (
    <div className="library-filters" role="group" aria-label="Lọc thư viện nội dung">
      <label className="field">
        <span>Khối</span>
        <select value={filters.grade} onChange={(e) => set({ grade: e.target.value, outcome: "" })}>
          <option value="">Tất cả</option>
          <option value="8">Lớp 8</option>
          <option value="9">Lớp 9</option>
        </select>
      </label>
      <label className="field">
        <span>Mạch nội dung</span>
        <select value={filters.domain} onChange={(e) => set({ domain: e.target.value, outcome: "" })}>
          <option value="">Tất cả</option>
          {taxonomy?.domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Yêu cầu cần đạt</span>
        <select value={filters.outcome} onChange={(e) => set({ outcome: e.target.value })}>
          <option value="">Tất cả</option>
          {visibleOutcomes.map((o) => (
            <option key={o.code} value={o.code}>
              {o.code} — {o.statement}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Nguồn</span>
        <select value={filters.scope} onChange={(e) => set({ scope: e.target.value })}>
          <option value="ALL">Tất cả</option>
          <option value="SHARED_LIBRARY">Bài nền dùng chung</option>
          <option value="TEACHER_PRIVATE">Bản riêng của tôi</option>
        </select>
      </label>
    </div>
  );
}

/** Coverage by grade × domain: numerator/denominator and gap list, never one blended percentage. */
export function CoverageTable({ rows, note, outcomes }: { rows: CoverageRow[]; note: string; outcomes: Outcome[] }) {
  const statement = (code: string) => outcomes.find((o) => o.code === code)?.statement ?? code;
  return (
    <section className="panel coverage-panel" aria-labelledby="coverage-title">
      <h2 id="coverage-title">Độ bao phủ yêu cầu cần đạt lớp 8–9</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Khối</th>
              <th>Mạch nội dung</th>
              <th>Bài nền đã phát hành</th>
              <th>Bài riêng của tôi</th>
              <th>Bản đồ mẫu (phát triển)</th>
              <th>Còn thiếu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const gaps = row.releasedBaseline?.gaps ?? row.fixture?.gaps ?? [];
              return (
                <tr key={row.grade + row.domain}>
                  <td>Lớp {row.grade}</td>
                  <td>{row.domainLabel}</td>
                  <td>{metricText(row.releasedBaseline)}</td>
                  <td>{metricText(row.ownPublished)}</td>
                  <td>{row.fixture ? metricText(row.fixture) : "—"}</td>
                  <td>
                    {gaps.length ? (
                      <details>
                        <summary>{gaps.length} yêu cầu</summary>
                        <ul className="gap-list">
                          {gaps.map((code) => (
                            <li key={code}>
                              <b>{code}</b> {statement(code)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="tiny muted">{note}</p>
    </section>
  );
}

/** Domain, outcome tags and the teacher's challenge parameters for one lesson draft. */
export function TaxonomyFields({
  edit,
  setEdit,
  taxonomy,
  outcomes,
}: {
  edit: any;
  setEdit: (update: (s: any) => any) => void;
  taxonomy?: Taxonomy;
  outcomes: Outcome[];
}) {
  const codes: string[] = edit.outcomeCodes ?? [];
  const candidates = outcomes.filter((o) => o.grade === Number(edit.grade) && (!edit.domain || o.domain === edit.domain));
  const spec = edit.labId ? taxonomy?.challengeParameters[edit.labId] : undefined;
  const params: Record<string, number | string> | null = edit.challengeParams ?? null;
  const defaults = () => Object.fromEntries(Object.entries(spec?.params ?? {}).map(([name, p]) => [name, p.default]));
  return (
    <fieldset className="review-checklist">
      <legend>Chương trình và thử thách</legend>
      <label className="field">
        <span>Mạch nội dung KHTN</span>
        <select
          value={edit.domain ?? ""}
          onChange={(e) => setEdit((s: any) => ({ ...s, domain: e.target.value || null, outcomeCodes: [] }))}
        >
          <option value="">Chưa chọn</option>
          {taxonomy?.domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <div className="outcome-picks" role="group" aria-label="Yêu cầu cần đạt">
        {candidates.length === 0 && <p className="tiny muted">Chưa có yêu cầu cần đạt cho khối và mạch nội dung này.</p>}
        {candidates.map((o) => (
          <label className="check" key={o.code}>
            <input
              type="checkbox"
              checked={codes.includes(o.code)}
              onChange={(e) =>
                setEdit((s: any) => ({
                  ...s,
                  outcomeCodes: e.target.checked ? [...codes, o.code] : codes.filter((c) => c !== o.code),
                }))
              }
            />
            <span>
              <b>{o.code}</b> {o.statement} {o.synthetic && <Badge tone="outline">Mẫu</Badge>}
            </span>
          </label>
        ))}
      </div>
      {spec && (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={params !== null}
              onChange={(e) => setEdit((s: any) => ({ ...s, challengeParams: e.target.checked ? defaults() : null }))}
            />
            Thêm thử thách tùy chỉnh sau phần thực hành
          </label>
          {params && (
            <div className="form-grid">
              {Object.entries(spec.params).map(([name, p]) => (
                <label className="field" key={name}>
                  <span>
                    {p.label}
                    {p.kind === "number" && ` (${p.min}–${p.max} ${p.unit})`}
                  </span>
                  {p.kind === "number" ? (
                    <input
                      type="number"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[name] ?? p.default}
                      onChange={(e) => setEdit((s: any) => ({ ...s, challengeParams: { ...params, [name]: Number(e.target.value) } }))}
                    />
                  ) : (
                    <select
                      value={String(params[name] ?? p.default)}
                      onChange={(e) => setEdit((s: any) => ({ ...s, challengeParams: { ...params, [name]: e.target.value } }))}
                    >
                      {p.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              ))}
            </div>
          )}
          {params && spec.rangeReview !== "approved" && (
            <p className="tiny muted">
              Khoảng tham số đang chờ duyệt khoa học (Q-C2-04): dùng được cho bài riêng tự kiểm duyệt, chưa dùng được cho thư viện chung.
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}

/** Sources and license shown wherever content is read (B1-T4). */
export function AttributionNote({ value }: { value?: Attribution | null }) {
  if (!value || (!value.sources && !value.note)) return null;
  return (
    <aside className="attribution tiny" aria-label="Nguồn và giấy phép">
      {value.note && <p>{value.note}</p>}
      {value.sources && (
        <p>
          <b>Nguồn:</b> {value.sources}
          {value.licenseLabel && (
            <>
              {" · "}
              <b>Giấy phép:</b> {value.licenseLabel}
            </>
          )}
        </p>
      )}
    </aside>
  );
}

/** Admin-only named release reviews for a shared-library lesson. */
export function ReleaseReviews({ lessonId, reviews }: { lessonId: string; reviews: Array<{ kind: string; label: string; reviewerName: string | null; at: string | null }> }) {
  const record = useAction((kind: string) => api(`/lessons/${lessonId}/release-reviews`, "POST", { kind }));
  return (
    <fieldset className="review-checklist">
      <legend>Duyệt phát hành thư viện chung</legend>
      <p className="tiny muted">Mỗi lượt duyệt ghi tên người duyệt. Người duyệt chuyên môn và người duyệt bản quyền phải khác nhau.</p>
      <ul className="release-reviews">
        {reviews.map((review) => (
          <li key={review.kind}>
            <span>
              {review.label}:{" "}
              {review.reviewerName ? (
                <b>
                  {review.reviewerName} ({new Date(review.at!).toLocaleDateString("vi-VN")})
                </b>
              ) : (
                "chưa duyệt"
              )}
            </span>
            <button type="button" className="text-button" disabled={record.isPending} onClick={() => record.mutate(review.kind)}>
              Ghi nhận tôi đã duyệt
            </button>
          </li>
        ))}
      </ul>
      <ErrorBox error={record.error} />
    </fieldset>
  );
}

const stepLabels: Record<string, string> = {
  READING: "Bài đọc",
  VIDEO: "Video",
  STUDY_CARDS: "Thẻ ghi nhớ",
  QUIZ: "Kiểm tra",
  LAB: "Thực hành",
  CHALLENGE: "Thử thách",
};

/** Student-view preview with the text alternative of every step and readiness blockers. */
export function PreviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["content-preview", id], queryFn: () => api(`/teacher/content/${id}/preview`) });
  const data = q.data;
  return (
    <Modal title={data ? "Xem trước: " + data.lesson.title : "Xem trước bài học"} onClose={onClose}>
      {q.isLoading && <InlineLoader message="Đang tạo bản xem trước…" />}
      {q.error && (
        <div className="load-error">
          <ErrorBox error={q.error} />
          <button type="button" onClick={() => q.refetch()}>
            Thử lại
          </button>
        </div>
      )}
      {data && (
        <>
          <p className="muted">
            {data.lesson.subject?.name} · Lớp {data.lesson.grade} · {data.lesson.chapter}
            {data.lesson.domainLabel && " · " + data.lesson.domainLabel}
          </p>
          {data.readiness.ready ? (
            <p className="notice" role="status">
              Sẵn sàng xuất bản.
            </p>
          ) : (
            <div className="notice" role="status">
              <b>Chưa thể xuất bản. Còn thiếu:</b>
              <ul className="publish-blockers">
                {data.readiness.blockers.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {data.pathwayError && <p className="error">{data.pathwayError}</p>}
          <ol className="preview-steps">
            {data.steps.map((step: any) => (
              <li key={step.position}>
                <h3>
                  {stepLabels[step.type] ?? step.type}
                  {step.title && ": " + step.title}
                </h3>
                {step.missingAlternative ? (
                  <p className="error">Thiếu phương án văn bản cho bước này.</p>
                ) : (
                  <p className="preview-text">{step.textAlternative}</p>
                )}
              </li>
            ))}
          </ol>
          {data.materials.some((m: any) => m.type === "video" && !m.hasTranscript) && (
            <p className="error">Có video chưa có bản chép lời.</p>
          )}
          <AttributionNote value={data.attribution} />
        </>
      )}
    </Modal>
  );
}
