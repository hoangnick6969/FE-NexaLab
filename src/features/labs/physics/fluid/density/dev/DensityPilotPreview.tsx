import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LabSpace } from "../../../../shared/LabSpace";
import { DensityActivity } from "../DensityActivity";
import { defaultDensityEvidence } from "../density-evidence";

/** Development-only host for the FL-03 2D pilot with local state; nothing is launched, graded or stored. */
export default function DensityPilotPreview() {
  const navigate = useNavigate();
  const [state, setState] = useState<unknown>(defaultDensityEvidence);
  return <LabSpace title="Xác định khối lượng riêng (xem trước)" onExit={() => navigate("/")}>
    <DensityActivity state={state} onChange={setState} resetKey={0} />
  </LabSpace>;
}
