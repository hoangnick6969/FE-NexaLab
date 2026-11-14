/**
 * Development-only route `/dev/lab-kits/k2?lab=fl-13|fl-14a|fl-10`.
 * One kit, three Lab configs: switching remounts the same ExploreBench with another config.
 * Not a Lab run and not graded.
 */
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { validateChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { k2LabConfigs } from "../../labs";
import { ExploreBench } from "../ExploreBench";

export default function K2KitPreview() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const labKey = params.get("lab") && k2LabConfigs[params.get("lab")!] ? params.get("lab")! : "fl-13";
  const config = k2LabConfigs[labKey];
  const validation = useMemo(() => validateChemistryLabConfig(config), [config]);
  if (!validation.ok) {
    return <main className="panel" style={{ margin: 24 }} role="alert">
      <h1>Config {config.catalogId} không hợp lệ</h1>
      <ul>{validation.errors.map((error) => <li key={error}><code>{error}</code></li>)}</ul>
    </main>;
  }
  const devbar = <div className="k2-devbar" aria-label="Thanh dev">
    <label>Bài lab <select value={labKey} onChange={(event) => setParams({ lab: event.target.value })}>
      {Object.entries(k2LabConfigs).map(([key, item]) => <option key={key} value={key}>{item.catalogId} · {item.title}</option>)}
    </select></label>
    <span className="k2-dev-badge" title="Dữ liệu hoá học là bản nháp kỹ thuật, chờ reviewer duyệt">Dữ liệu chưa duyệt</span>
    {validation.warnings.length > 0 && <span className="k2-dev-badge is-error" title={validation.warnings.join("\n")}>{validation.warnings.length} cảnh báo config</span>}
  </div>;
  return <ExploreBench key={labKey} config={validation.config} onExit={() => navigate("/")} headerExtra={devbar}
    draftNotice="Bản dev: dữ liệu hoá học là bản nháp kỹ thuật, chưa được reviewer môn Hoá duyệt." />;
}
