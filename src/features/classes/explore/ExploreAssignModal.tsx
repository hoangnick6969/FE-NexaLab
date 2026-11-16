/**
 * Teacher flow for Class Explore (P0 C3): pick an Explore Lab that has a class template, choose inside the template (samples and
 * a question), preview the bench exactly as a student gets it, then save and assign. The same derive function runs on the server.
 */
import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, idempotencyKey, isApiError, mutate } from "../../../lib/api";
import { Field, Modal } from "../../../components/ui";
import { defineText, formatDateTime } from "../../../i18n";
import { classItemLabels, exploreBench, type ClassDerivation } from "../../labs/runtime/explore-registry";
import { measureText, type ExploreRequirement } from "../../labs/class-explore/class-explore";
import type { ClassSummary } from "../class-types";
import { LoadError } from "../class-ui";

const text = defineText({
  vi: {
    title: "Giao bài Explore", lab: "Phòng thí nghiệm", chooseLab: "Chọn Lab Explore",
    none: "Chưa có Lab Explore nào có mẫu cho lớp. Mẫu xuất hiện khi NexaLab phát hành phiên bản mới của Lab.",
    template: "Mẫu",
    lesson: "Bài học liên quan", chooseLesson: "Chọn bài học", noLesson: "Chưa có bài học cùng khối để gắn bài này.",
    instructions: "Lời dặn cho học sinh (không bắt buộc)", taskName: "Tên bài giao", due: "Hạn nộp (không bắt buộc)",
    audience: (n: number) => `Giao cho cả lớp`, previewHeading: "Học sinh sẽ nhận", requirements: "Yêu cầu nộp",
    explain: "Một lời giải thích", items: "Dụng cụ và hoá chất trên bàn", question: "Câu hỏi",
    openBench: "Mở bàn xem trước", previewNote: "Xem trước: đây là bàn học sinh sẽ mở. Số em đo ở đây không được lưu.",
    cancel: "Hủy", assign: "Lưu và giao bài", assigning: "Đang giao…",
    selectionInvalid: "Lựa chọn chưa hợp lệ", failed: "Chưa giao được bài.", retryKept: "Bài nháp đã lưu; bấm giao lại sẽ dùng tiếp, không tạo bản mới.",
    loading: "Đang tải…",
  },
  en: {
    title: "Assign an Explore lab", lab: "Lab", chooseLab: "Choose an Explore lab",
    none: "No Explore lab has a class template yet. Templates appear when NexaLab publishes a new version of the Lab.",
    template: "Template",
    lesson: "Related lesson", chooseLesson: "Choose a lesson", noLesson: "There is no lesson of this grade to attach this to.",
    instructions: "Note for students (optional)", taskName: "Assignment name", due: "Due (optional)",
    audience: () => "Assign to the whole class", previewHeading: "Students will get", requirements: "What they hand in",
    explain: "One explanation", items: "Apparatus and reagents on the bench", question: "Question",
    openBench: "Open the bench preview", previewNote: "Preview: this is the bench students open. Readings taken here are not saved.",
    cancel: "Cancel", assign: "Save and assign", assigning: "Assigning…",
    selectionInvalid: "This selection is not valid", failed: "Could not assign.", retryKept: "The draft was saved; assigning again reuses it and creates no new one.",
    loading: "Loading…",
  },
});

type LabRow = { id: string; title: string; mode: string; explore?: { ok: true; kit: string; config: any } | { ok: false } };
type Template = { id: string; titleVi: string };

export function ExploreAssignModal({ classroom, onClose, onAssigned }: { classroom: ClassSummary; onClose: () => void; onAssigned: (message: string) => void }) {
  const t = text();
  const labs = useQuery<LabRow[]>({ queryKey: ["labs"], queryFn: () => api("/labs") });
  const content = useQuery<{ lessons: Array<{ id: string; title: string; grade: number; labId?: string | null }> }>({ queryKey: ["assignable", classroom.id], queryFn: () => api(`/classes/${classroom.id}/assignable-content`) });
  const candidates = (labs.data ?? []).filter((row): row is LabRow & { explore: { ok: true; kit: string; config: any } } =>
    row.mode === "explore" && row.explore?.ok === true && Boolean(row.explore.config?.classTemplates?.length) && Boolean(exploreBench(row.explore.kit)?.deriveClass) && Boolean(exploreBench(row.explore.kit)?.ClassTemplateForm));

  const [labId, setLabId] = useState("");
  const lab = candidates.find((row) => row.id === labId) ?? candidates[0];
  if (lab && lab.id !== labId) setLabId(lab.id);
  return <Modal title={t.title} onClose={onClose}>
    <LoadError query={labs} what={t.lab} />
    {labs.isPending && <p role="status">{t.loading}</p>}
    {labs.data && !lab && <p className="notice" data-testid="explore-none">{t.none}</p>}
    {lab && <ExploreAssignForm key={lab.id} classroom={classroom} lab={lab} labs={candidates} onLab={setLabId} lessons={content.data?.lessons ?? []} onClose={onClose} onAssigned={onAssigned} />}
  </Modal>;
}

function ExploreAssignForm({ classroom, lab, labs, onLab, lessons, onClose, onAssigned }: {
  classroom: ClassSummary; lab: LabRow & { explore: { ok: true; kit: string; config: any } }; labs: LabRow[]; onLab: (id: string) => void;
  lessons: Array<{ id: string; title: string; grade: number; labId?: string | null }>; onClose: () => void; onAssigned: (message: string) => void;
}) {
  const t = text();
  const { config, kit } = lab.explore;
  const bench = exploreBench(kit)!;
  const templates: Template[] = config.classTemplates;
  const [templateId, setTemplateId] = useState(templates[0].id);
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  const [choice, setChoice] = useState<{ selection: Record<string, unknown> | null; summary: string }>({ selection: null, summary: "" });
  const [instructions, setInstructions] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const labels = useMemo(() => classItemLabels(config), [config]);
  const words = measureText();
  const promptText = (id: string) => config.pedagogy?.observationPrompts?.find((prompt: any) => prompt.id === id)?.textVi ?? id;
  const selection = choice.selection;
  const derived: ClassDerivation | null = useMemo(() => (selection && bench.deriveClass ? bench.deriveClass(config, selection) : null), [bench, config, JSON.stringify(selection)]);
  const asked = (item: ExploreRequirement) => (item.kind === "measure" ? words[item.measurement].asked(labels[item.itemId] ?? item.itemId) : t.explain);
  const TemplateForm = bench.ClassTemplateForm!;

  const matchingLessons = lessons.filter((lesson) => lesson.grade === classroom.grade);
  const defaultLesson = (matchingLessons.find((lesson) => lesson.labId === lab.id) ?? matchingLessons[0])?.id ?? "";
  const lesson = lessonId || defaultLesson;
  const stamp = useRef(formatDateTime(new Date())).current;
  const name = title.trim() || `${lab.title}: ${choice.summary || template.titleVi} · ${stamp}`;

  const ClassPage = useMemo(() => (bench.loadClassPage ? lazy(bench.loadClassPage) : null), [bench]);
  const resourceKey = useRef(idempotencyKey());
  const publishKey = useRef(idempotencyKey());
  const assignKey = useRef(idempotencyKey());
  const saved = useRef<{ resourceId?: string; published?: boolean }>({});
  const run = useMutation({
    mutationFn: async () => {
      if (!saved.current.resourceId) {
        const resource = await mutate<{ id: string }>(`/classes/${classroom.id}/resources`, "POST",
          { kind: "EXPLORE_LAB", title: name, lessonId: lesson, content: { source: { labId: lab.id }, selection, instructions } }, resourceKey.current);
        saved.current.resourceId = resource.id;
      }
      if (!saved.current.published) {
        await mutate(`/classes/${classroom.id}/resources/${saved.current.resourceId}/publish`, "POST", {}, publishKey.current);
        saved.current.published = true;
      }
      return mutate<{ message: string }>(`/classes/${classroom.id}/assignments`, "POST", {
        contentType: "explore_lab", contentId: lab.id, exploreResourceId: saved.current.resourceId, title: name,
        audience: "CLASS", studentIds: [], dueDate: due ? new Date(due).toISOString() : null,
      }, assignKey.current);
    },
    onSuccess: (data) => onAssigned(data.message),
  });

  const failure = run.error;
  const canAssign = Boolean(derived?.ok) && Boolean(lesson) && !run.isPending;

  return <form onSubmit={(event) => { event.preventDefault(); if (canAssign) run.mutate(); }} data-testid="explore-assign-form">
    {labs.length > 1 && <label className="field"><span>{t.lab}</span>
      <select value={lab.id} onChange={(event) => onLab(event.target.value)}>{labs.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select>
    </label>}
    {templates.length > 1
      ? <label className="field"><span>{t.template}</span>
        <select value={template.id} onChange={(event) => { setTemplateId(event.target.value); setChoice({ selection: null, summary: "" }); }}>{templates.map((item) => <option key={item.id} value={item.id}>{item.titleVi}</option>)}</select>
      </label>
      : <p><strong>{lab.title}</strong> · {template.titleVi}</p>}

    <TemplateForm key={template.id} config={config} template={template} labels={labels} onChange={setChoice} />

    <label className="field"><span>{t.instructions}</span><textarea rows={3} maxLength={10000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
    <label className="field"><span>{t.lesson}</span>
      <select required value={lesson} onChange={(event) => setLessonId(event.target.value)}>
        <option value="">{t.chooseLesson}</option>
        {matchingLessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    </label>
    {matchingLessons.length === 0 && <p className="notice">{t.noLesson}</p>}
    <Field label={t.taskName} value={title} placeholder={name} maxLength={160} onChange={(event) => setTitle(event.target.value)} />
    <Field label={t.due} type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} />
    <p className="tiny muted">{t.audience(0)}</p>

    {derived && !derived.ok && <div className="error" role="alert"><strong>{t.selectionInvalid}</strong><ul>{derived.errors.map((error) => <li key={error}><code>{error}</code></li>)}</ul></div>}
    {derived?.ok && <section className="panel" aria-label={t.previewHeading} data-testid="explore-preview">
      <h3>{t.previewHeading}</h3>
      <h4>{t.question}</h4><p>{promptText(derived.promptId)}</p>
      <h4>{t.requirements}</h4>
      <ul>{derived.requirements.map((item, index) => <li key={index}>{asked(item)}</li>)}</ul>
      <h4>{t.items}</h4>
      <p className="tiny" data-testid="explore-preview-items">{bench.listKitItems(derived.config).map((item) => item.labelVi).join(" · ")}</p>
      {ClassPage && <button type="button" className="secondary" onClick={() => setPreviewOpen(true)}>{t.openBench}</button>}
    </section>}
    {previewOpen && derived?.ok && ClassPage && <Suspense fallback={<p role="status">{t.loading}</p>}>
      <ClassPage title={lab.title} config={derived.config} storageKey={`preview:${classroom.id}:${lab.id}:${template.id}`} onExit={() => setPreviewOpen(false)}
        classSection={<section className="class-lab-instructions"><p>{t.previewNote}</p>{derived.requirements.map((item, index) => <p key={index} className="tiny">{asked(item)}</p>)}</section>} />
    </Suspense>}

    {failure && <div className="error" role="alert">
      <p>{isApiError(failure) && failure.code ? `${t.failed} (${failure.code})` : failure instanceof Error && failure.message ? failure.message : t.failed}</p>
      {saved.current.resourceId && <p className="tiny">{t.retryKept}</p>}
    </div>}
    <div className="button-row">
      <button type="button" className="secondary" onClick={onClose}>{t.cancel}</button>
      <button type="submit" className="primary" disabled={!canAssign}>{run.isPending ? t.assigning : t.assign}</button>
    </div>
  </form>;
}

