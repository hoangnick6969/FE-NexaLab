/** `/labs/:id` page of kit `k7-molecular` (FL-27): pick a released gene variant and read its mRNA, codons and amino acids. Explore only. */
import { useState } from "react";
import type { MolecularExploreConfig } from "@nexalab/sim/explore-kits";
import { fl27VariantResult } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabSpace } from "../../shared/LabSpace";

export default function MolecularExplorePage({ labId, title, config: raw }: ExplorePageProps) {
  const config = raw as MolecularExploreConfig;
  const variants = config.spec.allowedVariants;
  const [variant, setVariant] = useState<string>(variants[0]);
  const result = fl27VariantResult(variant);
  const { mutation } = result;
  return (
    <LabSpace title={title || config.title} exitTo="/labs">
      <section className="panel" data-testid="molecular-page" data-lab={labId}>
        <label>Biến thể gene{" "}
          <select value={variant} onChange={(event) => setVariant(event.target.value)} aria-label="Biến thể gene">
            {variants.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <p>mRNA: <code>{result.mrna}</code></p>
        <p>Codon: {result.codons.join(" ")}</p>
        <p>Chuỗi axit amin: {result.aminoAcids.join(" – ")}</p>
        <p data-testid="mutation-effect">
          Vị trí {mutation.position + 1}: {mutation.from} → {mutation.to}. Axit amin {mutation.originalAminoAcid} → {mutation.aminoAcid} ({mutation.effect === "SILENT" ? "đột biến im lặng" : mutation.effect === "MISSENSE" ? "đột biến sai nghĩa" : "đột biến vô nghĩa"}).
        </p>
      </section>
    </LabSpace>
  );
}
