import { useState } from "react";
import { getLocale } from "../../../i18n";
import { WhatIfPanel } from "../biology/ecology/WhatIfPanel";
import { LAB_WHAT_IFS, type LabWhatIfKind } from "./what-if-labs";

/** B3 what-if@2: preset questions answered by the Lab's own model; local view state only, never submitted. */
export function LabWhatIf({ kind }: { kind: LabWhatIfKind }) {
  const [selected, setSelected] = useState<string | null>(null);
  const spec = LAB_WHAT_IFS[kind];
  const locale = getLocale();
  return <WhatIfPanel items={spec.items(locale)} selectedId={selected} answer={selected ? spec.answer(selected, locale) : null} onSelect={(item) => setSelected(item.id)} />;
}
