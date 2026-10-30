import { defineText } from "../../i18n";

const text = defineText({
  vi: { science: "KHTN", grade: (n: number) => `LỚP ${n}` },
  en: { science: "NATURAL SCIENCE", grade: (n: number) => `GRADE ${n}` },
});

export function labCurriculumLabel(lab: any, fallbackSubject: string, fallbackGrade: string) {
  const t = text();
  const codes = [lab?.topicCode, ...(lab?.lessonLinks ?? []).map((lesson: any) => lesson.topicCode)];
  const science = codes.map((code) => typeof code === "string" ? /^KHTN(\d+)-/.exec(code) : null).find(Boolean);
  const grade = science ? Number(science[1]) : lab?.grade;
  return {
    subject: science ? t.science : lab?.subject?.name ?? fallbackSubject,
    grade: Number.isInteger(grade) && grade > 0 ? t.grade(grade) : fallbackGrade,
  };
}
