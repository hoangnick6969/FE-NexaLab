import { defineText } from "../../../../../../i18n";
import { CODON_AXIS, type CodonMeaning } from "../k7-codons";
import { AMINO_GROUP_COLORS, aminoGroup } from "../k7-palette";

const text = defineText({
  vi: { caption: "Bảng mã di truyền (codon trên mRNA)", first: "Base thứ nhất", second: "Base thứ hai", third: "Base thứ ba", stop: "Kết thúc" },
  en: { caption: "Genetic code (mRNA codons)", first: "First base", second: "Second base", third: "Third base", stop: "Stop" },
});

/**
 * The genetic code laid out like the textbook figure: rows by first base,
 * columns by second, each cell listing the four third-base codons. The table
 * comes from the Lab's pinned data; this view only reads it and marks the
 * codon in focus.
 */
export function CodonTable({ table, highlight = null }: { table: ReadonlyMap<string, CodonMeaning>; highlight?: string | null }) {
  const t = text();
  return <div className="k7-codon-table-wrap">
    <table className="k7-codon-table">
      <caption>{t.caption}</caption>
      <thead>
        <tr>
          <th scope="col"><span className="sr-only">{t.first}</span></th>
          {CODON_AXIS.map((second) => <th key={second} scope="col" aria-label={`${t.second} ${second}`}>{second}</th>)}
        </tr>
      </thead>
      <tbody>
        {CODON_AXIS.map((first) => <tr key={first}>
          <th scope="row" aria-label={`${t.first} ${first}`}>{first}</th>
          {CODON_AXIS.map((second) => <td key={second}>
            <ul>
              {CODON_AXIS.map((third) => {
                const codon = first + second + third;
                const meaning = table.get(codon)!;
                return <li key={codon} className={codon === highlight ? "is-highlight" : ""} aria-current={codon === highlight ? "true" : undefined}>
                  <span className="k7-codon">{codon}</span>
                  <span className="k7-aa" style={{ borderColor: AMINO_GROUP_COLORS[aminoGroup(meaning)] }}>{meaning === "Stop" ? t.stop : meaning}</span>
                </li>;
              })}
            </ul>
          </td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
