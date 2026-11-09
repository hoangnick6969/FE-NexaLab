import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Badge, ErrorBox, Modal, useAction, InlineLoader } from "../../components/ui";
import { defineText, formatDate } from "../../i18n";

const text = defineText({
  vi: {
    noMap: "Chưa có bản đồ",
    filters: "Lọc thư viện nội dung",
    gradeLabel: "Khối",
    all: "Tất cả",
    grade: (grade: number) => `Lớp ${grade}`,
    strand: "Mạch nội dung",
    outcome: "Yêu cầu cần đạt",
    sourceLabel: "Nguồn",
    sharedBase: "Bài nền dùng chung",
    myPrivate: "Bản riêng của tôi",
    coverage: "Độ bao phủ yêu cầu cần đạt lớp 8–9",
    publishedBase: "Bài nền đã phát hành",
    myLessons: "Bài riêng của tôi",
    sampleMap: "Bản đồ mẫu (phát triển)",
    missing: "Còn thiếu",
    outcomes: (n: number) => `${n} yêu cầu`,
    curriculumAndChallenge: "Chương trình và thử thách",
    khtnStrand: "Mạch nội dung KHTN",
    notChosen: "Chưa chọn",
    noOutcomes: "Chưa có yêu cầu cần đạt cho khối và mạch nội dung này.",
    sampleBadge: "Mẫu",
    addChallenge: "Thêm thử thách tùy chỉnh sau phần thực hành",
    rangePending: "Khoảng tham số đang chờ duyệt khoa học (Q-C2-04): dùng được cho bài riêng tự kiểm duyệt, chưa dùng được cho thư viện chung.",
    rangeTeamDefault: "Khoảng tham số là mặc định tạm thời do nhóm kỹ thuật đặt (2026-11-09), đang chờ chủ sản phẩm và người duyệt xác nhận: dùng được cho bài riêng và cho gợi ý AI, chưa dùng được cho thư viện chung.",
    attribution: "Nguồn và giấy phép",
    source: "Nguồn:",
    licence: "Giấy phép:",
    releaseReview: "Duyệt phát hành thư viện chung",
    reviewRule: "Mỗi lượt duyệt ghi tên người duyệt. Người duyệt chuyên môn và người duyệt bản quyền phải khác nhau.",
    notReviewed: "chưa duyệt",
    recordReview: "Ghi nhận tôi đã duyệt",
    steps: { READING: "Bài đọc", VIDEO: "Video", STUDY_CARDS: "Thẻ ghi nhớ", QUIZ: "Kiểm tra", LAB: "Thực hành", CHALLENGE: "Thử thách" } as Record<string, string>,
    previewOf: (title: string) => `Xem trước: ${title}`,
    previewLesson: "Xem trước bài học",
    buildingPreview: "Đang tạo bản xem trước…",
    retry: "Thử lại",
    ready: "Sẵn sàng xuất bản.",
    blocked: "Chưa thể xuất bản. Còn thiếu:",
    noTextAlternative: "Thiếu phương án văn bản cho bước này.",
    noTranscript: "Có video chưa có bản chép lời.",
  },
  en: {
    noMap: "No map yet",
    filters: "Filter the content library",
    gradeLabel: "Grade",
    all: "All",
    grade: (grade: number) => `Grade ${grade}`,
    strand: "Content strand",
    outcome: "Learning outcome",
    sourceLabel: "Source",
    sharedBase: "Shared base lessons",
    myPrivate: "My private copies",
    coverage: "Learning outcome coverage, grades 8–9",
    publishedBase: "Published base lessons",
    myLessons: "My private lessons",
    sampleMap: "Sample map (development)",
    missing: "Missing",
    outcomes: (n: number) => `${n} ${n === 1 ? "outcome" : "outcomes"}`,
    curriculumAndChallenge: "Curriculum and challenge",
    khtnStrand: "Natural science strand",
    notChosen: "Not chosen",
    noOutcomes: "No learning outcomes for this grade and strand yet.",
    sampleBadge: "Sample",
    addChallenge: "Add a custom challenge after the practice",
    rangePending: "Parameter ranges await scientific review (Q-C2-04): usable in self-reviewed private lessons, not yet in the shared library.",
    rangeTeamDefault: "The parameter ranges are temporary defaults set by the engineering team (2026-11-09), awaiting product owner and reviewer confirmation: usable in private lessons and for AI suggestions, not yet in the shared library.",
    attribution: "Sources and licence",
    source: "Source:",
    licence: "Licence:",
    releaseReview: "Shared library release review",
    reviewRule: "Each review records the reviewer's name. The subject reviewer and the rights reviewer must be different people.",
    notReviewed: "not reviewed",
    recordReview: "Record my review",
    steps: { READING: "Reading", VIDEO: "Video", STUDY_CARDS: "Study cards", QUIZ: "Quiz", LAB: "Practice", CHALLENGE: "Challenge" },
    previewOf: (title: string) => `Preview: ${title}`,
    previewLesson: "Lesson preview",
    buildingPreview: "Building the preview…",
    retry: "Try again",
    ready: "Ready to publish.",
    blocked: "Cannot publish yet. Missing:",
    noTextAlternative: "This step has no text alternative.",
    noTranscript: "A video has no transcript.",
  },
});
const t = text();

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
  challengeParameters: Record<string, { modelRef: string; rangeReview: string; boundsRef?: string; params: Record<string, NumberParam | ChoiceParam> }>;
};
export type Attribution = { sources: string | null; license: string | null; licenseLabel: string | null; synthetic: boolean; note: string | null };

export const libraryQuery = (filters: LibraryFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && value !== "ALL") params.set(key, value);
  const query = params.toString();
  return "/teacher/content" + (query ? "?" + query : "");
};

const metricText = (metric: Metric) => (metric ? `${metric.covered}/${metric.total}` : t.noMap);

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
    <div className="library-filters" role="group" aria-label={t.filters}>
      <label className="field">
        <span>{t.gradeLabel}</span>
        <select value={filters.grade} onChange={(e) => set({ grade: e.target.value, outcome: "" })}>
          <option value="">{t.all}</option>
          <option value="8">{t.grade(8)}</option>
          <option value="9">{t.grade(9)}</option>
        </select>
      </label>
      <label className="field">
        <span>{t.strand}</span>
        <select value={filters.domain} onChange={(e) => set({ domain: e.target.value, outcome: "" })}>
          <option value="">{t.all}</option>
          {taxonomy?.domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t.outcome}</span>
        <select value={filters.outcome} onChange={(e) => set({ outcome: e.target.value })}>
          <option value="">{t.all}</option>
          {visibleOutcomes.map((o) => (
            <option key={o.code} value={o.code}>
              {o.code} — {o.statement}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t.sourceLabel}</span>
        <select value={filters.scope} onChange={(e) => set({ scope: e.target.value })}>
          <option value="ALL">{t.all}</option>
          <option value="SHARED_LIBRARY">{t.sharedBase}</option>
          <option value="TEACHER_PRIVATE">{t.myPrivate}</option>
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
      <h2 id="coverage-title">{t.coverage}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.gradeLabel}</th>
              <th>{t.strand}</th>
              <th>{t.publishedBase}</th>
              <th>{t.myLessons}</th>
              <th>{t.sampleMap}</th>
              <th>{t.missing}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const gaps = row.releasedBaseline?.gaps ?? row.fixture?.gaps ?? [];
              return (
                <tr key={row.grade + row.domain}>
                  <td>{t.grade(row.grade)}</td>
                  <td>{row.domainLabel}</td>
                  <td>{metricText(row.releasedBaseline)}</td>
                  <td>{metricText(row.ownPublished)}</td>
                  <td>{row.fixture ? metricText(row.fixture) : "—"}</td>
                  <td>
                    {gaps.length ? (
                      <details>
                        <summary>{t.outcomes(gaps.length)}</summary>
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
      <legend>{t.curriculumAndChallenge}</legend>
      <label className="field">
        <span>{t.khtnStrand}</span>
        <select
          value={edit.domain ?? ""}
          onChange={(e) => setEdit((s: any) => ({ ...s, domain: e.target.value || null, outcomeCodes: [] }))}
        >
          <option value="">{t.notChosen}</option>
          {taxonomy?.domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <div className="outcome-picks" role="group" aria-label={t.outcome}>
        {candidates.length === 0 && <p className="tiny muted">{t.noOutcomes}</p>}
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
              <b>{o.code}</b> {o.statement} {o.synthetic && <Badge tone="outline">{t.sampleBadge}</Badge>}
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
            {t.addChallenge}
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
              {spec.rangeReview === "team-lead-default" ? t.rangeTeamDefault : t.rangePending}
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
    <aside className="attribution tiny" aria-label={t.attribution}>
      {value.note && <p>{value.note}</p>}
      {value.sources && (
        <p>
          <b>{t.source}</b> {value.sources}
          {value.licenseLabel && (
            <>
              {" · "}
              <b>{t.licence}</b> {value.licenseLabel}
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
      <legend>{t.releaseReview}</legend>
      <p className="tiny muted">{t.reviewRule}</p>
      <ul className="release-reviews">
        {reviews.map((review) => (
          <li key={review.kind}>
            <span>
              {review.label}:{" "}
              {review.reviewerName ? (
                <b>
                  {review.reviewerName} ({formatDate(review.at!)})
                </b>
              ) : (
                t.notReviewed
              )}
            </span>
            <button type="button" className="text-button" disabled={record.isPending} onClick={() => record.mutate(review.kind)}>
              {t.recordReview}
            </button>
          </li>
        ))}
      </ul>
      <ErrorBox error={record.error} />
    </fieldset>
  );
}

const stepLabels: Record<string, string> = t.steps;

/** Student-view preview with the text alternative of every step and readiness blockers. */
export function PreviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["content-preview", id], queryFn: () => api(`/teacher/content/${id}/preview`) });
  const data = q.data;
  return (
    <Modal title={data ? t.previewOf(data.lesson.title) : t.previewLesson} onClose={onClose}>
      {q.isLoading && <InlineLoader message={t.buildingPreview} />}
      {q.error && (
        <div className="load-error">
          <ErrorBox error={q.error} />
          <button type="button" onClick={() => q.refetch()}>
            {t.retry}
          </button>
        </div>
      )}
      {data && (
        <>
          <p className="muted">
            {data.lesson.subject?.name} · {t.grade(data.lesson.grade)} · {data.lesson.chapter}
            {data.lesson.domainLabel && " · " + data.lesson.domainLabel}
          </p>
          {data.readiness.ready ? (
            <p className="notice" role="status">
              {t.ready}
            </p>
          ) : (
            <div className="notice" role="status">
              <b>{t.blocked}</b>
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
                  <p className="error">{t.noTextAlternative}</p>
                ) : (
                  <p className="preview-text">{step.textAlternative}</p>
                )}
              </li>
            ))}
          </ol>
          {data.materials.some((m: any) => m.type === "video" && !m.hasTranscript) && (
            <p className="error">{t.noTranscript}</p>
          )}
          <AttributionNote value={data.attribution} />
        </>
      )}
    </Modal>
  );
}
