/**
 * Teacher choices inside a wet-bench class template (P0 C3.1): exactly `count` reagents per group, and a question whose
 * wording may need particular reagents. Reports the selection only once it is complete.
 */
import { useEffect, useState } from "react";
import { defineText } from "../../../../../i18n";
import type { ClassTemplateFormProps } from "../../../runtime/explore-registry";

const text = defineText({
  vi: { pickCount: (picked: number, count: number) => `Chọn đúng ${count} (đã chọn ${picked})`, prompt: "Câu hỏi cho học sinh", promptNeeds: (names: string) => `Chỉ dùng khi chọn đúng ${names}` },
  en: { pickCount: (picked: number, count: number) => `Pick exactly ${count} (${picked} picked)`, prompt: "Question for students", promptNeeds: (names: string) => `Only when exactly ${names} are picked` },
});

type Template = { id: string; titleVi: string; reagentGroups: Array<{ id: string; labelVi: string; options: string[]; count: number }>; promptChoices: Array<{ promptId: string; onlyWithReagents?: string[] }> };

export function WetBenchClassTemplateForm({ config, template: raw, labels, thumbnailFor, onChange }: ClassTemplateFormProps) {
  const t = text();
  const template = raw as Template;
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [promptId, setPromptId] = useState("");
  const promptText = (id: string) => config.pedagogy?.observationPrompts?.find((prompt: any) => prompt.id === id)?.textVi ?? id;
  const chosen = new Set(Object.values(picks).flat());
  const available = (choice: Template["promptChoices"][number]) => (choice.onlyWithReagents ?? []).every((id) => chosen.has(id));
  const complete = template.reagentGroups.every((group) => (picks[group.id]?.length ?? 0) === group.count);
  const effectivePrompt = template.promptChoices.find((choice) => choice.promptId === promptId && available(choice)) ? promptId : "";
  const selection = complete && effectivePrompt
    ? { templateId: template.id, reagents: Object.fromEntries(template.reagentGroups.map((group) => [group.id, picks[group.id] ?? []])), promptId: effectivePrompt }
    : null;
  const summary = template.reagentGroups.flatMap((group) => picks[group.id] ?? []).map((id) => labels[id] ?? id).join(" và ");
  const signature = JSON.stringify([selection, summary]);
  useEffect(() => { onChange({ selection, summary }); }, [signature]);

  const toggle = (groupId: string, id: string, count: number) => setPicks((current) => {
    const now = current[groupId] ?? [];
    return { ...current, [groupId]: now.includes(id) ? now.filter((item) => item !== id) : now.length < count ? [...now, id] : now };
  });
  return <>
    {template.reagentGroups.map((group) => <fieldset className="segmented explore-template-options" key={group.id} aria-label={group.labelVi}>
      <legend>{group.labelVi} <span className="tiny muted">{t.pickCount(picks[group.id]?.length ?? 0, group.count)}</span></legend>
      {group.options.map((id) => {
        const on = (picks[group.id] ?? []).includes(id);
        const full = (picks[group.id]?.length ?? 0) >= group.count;
        const image = thumbnailFor?.(`reagent-${id}`);
        return <label className="check explore-template-option" key={id}>
          <input type="checkbox" checked={on} disabled={!on && full} onChange={() => toggle(group.id, id, group.count)} />
          {image && <img src={image} alt="" width={44} height={44} loading="lazy" decoding="async" />}
          <span>{labels[id] ?? id}</span>
        </label>;
      })}
    </fieldset>)}
    <fieldset className="segmented" aria-label={t.prompt}>
      <legend>{t.prompt}</legend>
      {template.promptChoices.map((choice) => {
        const ok = available(choice);
        return <label className="check" key={choice.promptId}>
          <input type="radio" name="explore-prompt" checked={effectivePrompt === choice.promptId} disabled={!ok} onChange={() => setPromptId(choice.promptId)} />
          <span>{promptText(choice.promptId)}{!ok && choice.onlyWithReagents && <em className="tiny muted"> ({t.promptNeeds(choice.onlyWithReagents.map((id) => labels[id] ?? id).join(" · "))})</em>}</span>
        </label>;
      })}
    </fieldset>
  </>;
}
