import { observeVessel, reactionById, reagentById, type ChemistryLabConfig, type Transition, type VesselState } from "@nexalab/sim/wet-bench";

/** One line of the learner's lab notebook. Local, unscored, never evidence. */
export type ObservationLogEntry = {
  seq: number;
  at: number;
  vesselId: string | null;
  locationVi: string;
  actionVi: string;
  phenomenaVi: string[];
  equations: string[];
  readings: { ph?: string; litmus?: string; scale?: string };
  reactions: string[];
  measurement?: "ph_meter" | "litmus_paper" | "scale";
  outOfScope?: boolean;
  /** Set on "add" lines so repeated identical additions to one vessel collapse into one line. */
  merge?: { key: string; microliters: number; label: string };
};

const comma = (value: string) => value.replace(".", ",");
export const formatPh = (tenths: number) => comma((tenths / 10).toFixed(1));
export const formatGrams = (micrograms: number) => `${comma((micrograms / 1_000_000).toFixed(2))} g`;

export function formatQuantity(microliters: number) {
  const ml = comma(String(+(microliters / 1000).toFixed(3)));
  if (microliters % 50 !== 0) return `${ml} mL`;
  return microliters <= 250 ? `${microliters / 50} giọt` : `${ml} mL (${microliters / 50} giọt)`;
}

export const PIECE_NAME: Record<string, string> = { granule: "hạt", chips: "viên", nail: "chiếc đinh", foil: "lá" };

const BAND_VI = { colourless: "không màu", light_pink: "hồng nhạt", deep_pink: "hồng đậm", unknown: "chưa xác định" } as const;

/** Observable change in one vessel, in child-facing words. Never names a product unless equations are revealed. */
export function describeVesselChange(before: VesselState, after: VesselState, transition: Transition | null) {
  const prev = observeVessel(before).visual;
  const next = observeVessel(after, transition).visual;
  const phenomena: string[] = [];
  const prevBand = prev.indicator?.band ?? null;
  const nextBand = next.indicator?.band ?? null;
  if (nextBand && nextBand !== prevBand) {
    if (nextBand === "colourless") phenomena.push(prevBand && prevBand !== "unknown" ? "Dung dịch mất màu hồng" : "Dung dịch vẫn không màu");
    else if (nextBand === "unknown") phenomena.push("Màu chất chỉ thị nằm ngoài phạm vi mô hình");
    else if (prevBand === "light_pink" || prevBand === "deep_pink") phenomena.push(`Màu hồng chuyển ${BAND_VI[nextBand]}`);
    else phenomena.push(`Dung dịch chuyển màu ${BAND_VI[nextBand]}`);
  }
  if (next.gasBubbles.intensity !== "none") {
    phenomena.push(next.gasBubbles.intensity === "vigorous" ? "Sủi bọt khí mạnh" : next.gasBubbles.intensity === "low" ? "Sủi bọt khí chậm, ít" : "Sủi bọt khí");
  }
  if (next.precipitate && (!prev.precipitate || next.precipitate.amount > prev.precipitate.amount + 0.001)) {
    phenomena.push(prev.precipitate ? "Kết tủa nhiều thêm" : `Xuất hiện kết tủa ${next.precipitate.color === "#f4f4ee" ? "màu trắng" : ""}`.trim());
  }
  const coated = next.solids.some((solid) => solid.coatingColor && !prev.solids.find((p) => p.pieceId === solid.pieceId)?.coatingColor);
  if (coated) phenomena.push("Bề mặt kim loại phủ một lớp màu đỏ nâu");
  if (!next.indicator && prev.liquidTint && next.liquidTint && next.liquidTint.opacity < prev.liquidTint.opacity - 0.02 && after.solutionMicroliters <= before.solutionMicroliters + 2000) {
    phenomena.push("Màu xanh của dung dịch nhạt dần");
  }
  if (!phenomena.length) {
    if (before.solutionMicroliters === 0 && after.solutionMicroliters > 0 && !next.liquidTint) phenomena.push("Dung dịch trong suốt, không màu");
    else if (before.solutionMicroliters === 0 && next.liquidTint) phenomena.push("Dung dịch có màu xanh lam");
    else phenomena.push("Không thấy biến đổi rõ rệt");
  }
  return phenomena;
}

export function equationsFor(transition: Transition | null, config: ChemistryLabConfig) {
  if (!transition || config.pedagogy.revealEquations === "never") return [];
  return transition.fired.map((fired) => reactionById(fired.reactionId)?.equationDisplay).filter((value): value is string => Boolean(value));
}

export const reagentLabel = (reagentId: string) => reagentById(reagentId)?.labelVi ?? reagentId;

/** Standard JSON for handing the notebook to a Class Lab endpoint later. */
export function exportObservationLog(config: ChemistryLabConfig, entries: readonly ObservationLogEntry[]) {
  return {
    schema: "k2-observation-log/1" as const,
    labId: config.labId,
    catalogId: config.catalogId,
    configVersion: config.configVersion,
    engine: config.engine,
    exportedAt: new Date().toISOString(),
    scored: false as const,
    entries: entries.map((entry) => ({
      seq: entry.seq,
      at: new Date(entry.at).toISOString(),
      location: entry.locationVi,
      action: entry.actionVi,
      phenomena: entry.phenomenaVi,
      equations: entry.equations,
      readings: entry.readings,
      reactions: entry.reactions,
      outOfScope: Boolean(entry.outOfScope),
    })),
  };
}

const DB_NAME = "nexalab-k2-observation-log";
const STORE = "logs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const logKey = (config: ChemistryLabConfig) => `${config.labId}@${config.configVersion}`;

/** Loads the saved notebook; storage failures (private mode, blocked) yield an empty one. */
export async function loadObservationLog(config: ChemistryLabConfig): Promise<ObservationLogEntry[]> {
  try {
    const db = await openDb();
    try {
      const record = await new Promise<{ entries?: ObservationLogEntry[] } | undefined>((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).get(logKey(config));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return Array.isArray(record?.entries) ? record!.entries.slice(-500) : [];
    } finally { db.close(); }
  } catch { return []; }
}

export async function saveObservationLog(config: ChemistryLabConfig, entries: readonly ObservationLogEntry[]) {
  try {
    const db = await openDb();
    try {
      db.transaction(STORE, "readwrite").objectStore(STORE).put({ key: logKey(config), labId: config.labId, configVersion: config.configVersion, entries: entries.slice(-500), updatedAt: Date.now() });
    } finally { db.close(); }
  } catch { /* Notebook still works for this session without storage. */ }
}
