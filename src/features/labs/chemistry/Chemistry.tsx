import { useState } from "react";
import { defineText } from "../../../i18n";

const text = defineText({
  vi: {
    red: "đỏ",
    purple: "tím",
    intro: "Nhúng giấy quỳ tím vào từng lọ mất nhãn. Quan sát màu giấy rồi xác định tính chất của dung dịch.",
    unlabelled: (n: number) => `Lọ ${n} — mất nhãn`,
    jar: (n: number) => `Lọ ${n}`,
    dip: (n: number) => `Nhúng giấy quỳ tím vào lọ ${n}`,
    turned: (colour: string) => `Giấy quỳ chuyển màu ${colour}.`,
    whichType: (n: number) => `Lọ ${n} thuộc loại nào?`,
    choose: "Chọn đáp án",
    acid: "Axit",
    neutral: "Trung tính",
    base: "Bazơ",
    disclaimer: "Mô phỏng giáo dục, không dùng thay cho phép đo thực tế.",
  },
  en: {
    red: "red",
    purple: "purple",
    intro: "Dip litmus paper into each unlabelled jar. Watch the colour, then decide what the solution is.",
    unlabelled: (n: number) => `Jar ${n} — unlabelled`,
    jar: (n: number) => `Jar ${n}`,
    dip: (n: number) => `Dip litmus paper into jar ${n}`,
    turned: (colour: string) => `The litmus paper turned ${colour}.`,
    whichType: (n: number) => `What kind is jar ${n}?`,
    choose: "Choose an answer",
    acid: "Acid",
    neutral: "Neutral",
    base: "Base",
    disclaimer: "An educational simulation, not a substitute for real measurement.",
  },
});
const t = text();

const jars = [
  { id: "jar1", color: "red", colorName: t.red },
  { id: "jar2", color: "purple", colorName: t.purple },
  { id: "jar3", color: "blue", colorName: "xanh" },
] as const;

export function Chemistry({
  state,
  onChange,
  result,
}: {
  state: any;
  onChange: (s: any) => void;
  result: any;
}) {
  const [dipped, setDipped] = useState<Record<string, boolean>>({});
  return (
    <div className="chemistry-lab">
      <div className="chem-controls">
        <p className="muted">{t.intro}</p>
        <div className="litmus-grid">
          {jars.map((jar, index) => (
            <div className="litmus-jar" key={jar.id}>
              <strong>{t.unlabelled(index + 1)}</strong>
              <div className="litmus-vessel" aria-label={t.jar(index + 1)}>
                <div className="litmus-liquid" />
                <div className={`litmus-strip ${dipped[jar.id] ? `litmus-strip--${jar.color}` : ""}`} aria-hidden="true" />
              </div>
              {!dipped[jar.id] ? (
                <button type="button" className="text-button" onClick={() => setDipped((current) => ({ ...current, [jar.id]: true }))}>
                  {t.dip(index + 1)}
                </button>
              ) : (
                <>
                  <p role="status">{t.turned(jar.colorName)}</p>
                  <label className="field">
                    <span>{t.whichType(index + 1)}</span>
                    <select value={state.samples?.[jar.id] ?? ""} onChange={(e) => onChange({ ...state, samples: { ...state.samples, [jar.id]: e.target.value } })}>
                      <option value="">{t.choose}</option>
                      <option value="acid">{t.acid}</option>
                      <option value="neutral">{t.neutral}</option>
                      <option value="base">{t.base}</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {result && <p className="beaker-caption">{result.phenomenon}</p>}
      <p className="tiny muted">{t.disclaimer}</p>
    </div>
  );
}
