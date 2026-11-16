/**
 * Teacher choices inside a mechanics bench class template (P0 C3.1, spec fl-06-class-explore-spec.md §4): one starting
 * load, one weight set, the gauge and the moment table when the template leaves them to the teacher, and a question.
 */
import { useEffect, useState } from "react";
import type { LeverClassTemplate } from "@nexalab/sim/mechanics";
import { defineText } from "../../../../../i18n";
import type { ClassTemplateFormProps } from "../../../runtime/explore-registry";
import { formatNewtons, weightSetThumbnailKey } from "./kit-items";

const text = defineText({
  vi: {
    load: "Tải ban đầu (cố định trên thanh)", weights: "Bộ quả nặng cho học sinh", gauge: "Cho dùng lực kế",
    table: "Hiện bảng moment", tableOff: "Tắt thì học sinh tự tính F × d từ thước và nhãn lực.", prompt: "Câu hỏi cho học sinh",
  },
  en: {
    load: "Starting load (fixed on the bar)", weights: "Weights for students", gauge: "Allow the spring gauge",
    table: "Show the moment table", tableOff: "Off: students work out F × d from the ruler and the force labels.", prompt: "Question for students",
  },
});

export function LeverClassTemplateForm({ config, template: raw, thumbnailFor, onChange }: ClassTemplateFormProps) {
  const t = text();
  const template = raw as LeverClassTemplate;
  const [loadPresetId, setLoadPresetId] = useState("");
  const [weightOptionIndex, setWeightOptionIndex] = useState(0);
  const [gauge, setGauge] = useState(false);
  const [momentTable, setMomentTable] = useState(true);
  const [promptId, setPromptId] = useState("");
  const promptText = (id: string) => config.pedagogy?.observationPrompts?.find((prompt: any) => prompt.id === id)?.textVi ?? id;
  const preset = template.loadPresets.find((item) => item.id === loadPresetId);
  const selection = preset && promptId
    ? {
      templateId: template.id, loadPresetId, weightOptionIndex,
      ...(template.gauge === "teacher_choice" ? { gauge } : {}),
      ...(template.momentTable === "teacher_choice" ? { momentTable } : {}),
      promptId,
    }
    : null;
  const summary = preset?.labelVi ?? "";
  const signature = JSON.stringify([selection, summary]);
  useEffect(() => { onChange({ selection, summary }); }, [signature]);

  return <>
    <fieldset className="segmented" aria-label={t.load} data-testid="lever-template-load">
      <legend>{t.load}</legend>
      {template.loadPresets.map((item) => <label className="check" key={item.id}>
        <input type="radio" name="lever-load" checked={loadPresetId === item.id} onChange={() => setLoadPresetId(item.id)} />{item.labelVi}
      </label>)}
    </fieldset>
    {template.weightOptions.length > 1 && <fieldset className="segmented explore-template-options" aria-label={t.weights}>
      <legend>{t.weights}</legend>
      {template.weightOptions.map((set, index) => {
        const image = thumbnailFor?.(weightSetThumbnailKey(set));
        return <label className="check explore-template-option" key={index}>
          <input type="radio" name="lever-weights" checked={weightOptionIndex === index} onChange={() => setWeightOptionIndex(index)} />
          {image && <img src={image} alt="" width={44} height={44} loading="lazy" decoding="async" />}
          <span>{set.map(formatNewtons).join(" · ")}</span>
        </label>;
      })}
    </fieldset>}
    {template.gauge === "teacher_choice" && <label className="check"><input type="checkbox" checked={gauge} onChange={(event) => setGauge(event.target.checked)} />{t.gauge}</label>}
    {template.momentTable === "teacher_choice" && <label className="check"><input type="checkbox" checked={momentTable} onChange={(event) => setMomentTable(event.target.checked)} />
      <span>{t.table}{!momentTable && <em className="tiny muted"> ({t.tableOff})</em>}</span></label>}
    <fieldset className="segmented" aria-label={t.prompt}>
      <legend>{t.prompt}</legend>
      {template.promptChoices.map((choice) => <label className="check" key={choice.promptId}>
        <input type="radio" name="explore-prompt" checked={promptId === choice.promptId} onChange={() => setPromptId(choice.promptId)} />{promptText(choice.promptId)}
      </label>)}
    </fieldset>
  </>;
}
