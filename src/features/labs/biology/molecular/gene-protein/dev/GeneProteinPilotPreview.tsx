import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LabSpace } from "../../../../shared/LabSpace";
import { GeneProteinActivity } from "../GeneProteinActivity";
import { defaultGeneEvidence } from "../gene-evidence";
import { fl27GeneConfig } from "../fl27-gene.config";

/**
 * Development-only host for the FL-27 pilot with local state; nothing is launched, graded or stored.
 * The variant picker stands in for the server's per-run pin.
 */
export default function GeneProteinPilotPreview() {
  const navigate = useNavigate();
  const [state, setState] = useState<unknown>(defaultGeneEvidence);
  const [variantId, setVariantId] = useState(fl27GeneConfig.variants[0].id);
  return <LabSpace title="Từ gene đến protein (xem trước)" onExit={() => navigate("/")}>
    <GeneProteinActivity state={state} onChange={setState} resetKey={0} runtimeParams={{ variantId }} />
    <div className="k7-preview-controls">
      <label>Biến thể gene (thay cho server){" "}
        <select value={variantId} onChange={(event) => setVariantId(event.target.value)} data-testid="gene-variant">
          {fl27GeneConfig.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.id}</option>)}
        </select>
      </label>
    </div>
  </LabSpace>;
}
