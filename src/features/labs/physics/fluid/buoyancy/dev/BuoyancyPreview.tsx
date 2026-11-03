import { useNavigate } from "react-router-dom";
import { LabSpace } from "../../../../shared/LabSpace";
import { BuoyancyActivity } from "../BuoyancyActivity";

export default function BuoyancyPreview() {
  const navigate = useNavigate();
  return <LabSpace title="FL-05 · Lực đẩy Ác-si-mét · preview" onExit={() => navigate("/dev/lab-kits/k3")}><BuoyancyActivity /></LabSpace>;
}
