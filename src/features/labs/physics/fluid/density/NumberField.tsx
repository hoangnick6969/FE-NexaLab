import { useEffect, useId, useState } from "react";
import { getLocale } from "../../../../../i18n";
import { parseDecimal } from "../kit";
import type { Num } from "./density-evidence";
import { densityText } from "./density-copy";

const show = (value: Num) => (value === null ? "" : String(value).replace(".", getLocale() === "vi" ? "," : "."));

/**
 * Decimal input that accepts "0,6" and "0.6". It keeps what the learner typed
 * while editing and reports a number, or null for empty or invalid text.
 */
export function NumberField({ label, value, onChange, unit, testId, readOnly = false, hideLabel = false }: {
  label: string;
  value: Num;
  onChange: (value: Num) => void;
  unit?: string;
  testId?: string;
  readOnly?: boolean;
  /** Table cells: the label stays for assistive technology only. */
  hideLabel?: boolean;
}) {
  const [text, setText] = useState(show(value));
  const errorId = useId();
  // A restored draft or a reset changes the value from outside.
  useEffect(() => { if (parseDecimal(text) !== value && !(value === null && parseDecimal(text) === null)) setText(show(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const invalid = text.trim() !== "" && parseDecimal(text) === null;
  return <label className="fl03-field">
    <span className={hideLabel ? "sr-only" : "fl03-field-label"}>{label}</span>
    <span className="fl03-field-control">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        readOnly={readOnly}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        data-testid={testId}
        onChange={(event) => { setText(event.target.value); onChange(parseDecimal(event.target.value)); }}
      />
      {unit && <span className="fl03-unit">{unit}</span>}
    </span>
    {invalid && <span id={errorId} role="alert" className="fl03-error">{densityText().invalidNumber}</span>}
  </label>;
}
