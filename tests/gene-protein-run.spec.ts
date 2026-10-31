import { expect, test, type Page } from "@playwright/test";

// FL-27 through the shared run host: launch → six stations → submit → server result. The API is mocked;
// the BE side of this contract is covered by gene-protein-e2e.integration.test.ts on an isolated database.
const student = {
  id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An",
  role: "STUDENT", grade: 9, mustChangePassword: false,
};

async function mockShell(page: Page) {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: {
    ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null,
    avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" },
  } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-lab", (route) => route.fulfill({ json: {
    id: "assignment-lab", title: "Từ gene đến protein", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "9A" },
    content: {
      id: "gene-protein", title: "Từ gene đến protein", subject: { id: "science", name: "KHTN" }, grade: 9,
      topic: "Từ gene đến protein", learningObjective: "Tái bản, phiên mã, dịch mã và đột biến điểm", prerequisites: "", challengeId: "gene_protein_001",
    },
  } }));
}

// Launch exactly as BE labs.controller returns it for a gene-expression pack (see the E2E test).
const launch = {
  contract: "lab-contract/1", runId: "gene-run", labId: "gene-protein", challengeId: "gene_protein_001",
  modelRef: "gene-expression@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-gene", activityVersion: 1,
  rubricVersion: "gene-protein-stations@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
  constraints: {}, initialState: null, rendererKey: "gene-expression", expiresAt: null, context: "ASSIGNMENT",
  assignmentId: "assignment-lab", versionBinding: "ASSIGNMENT_PINNED", runtimeParams: { variantId: "gene-b-missense" },
};

/** What a correct learner submits for gene B (Met–Glu–Pro–Tyr–Gly–Stop; GAA → GUA). Mirrors the BE schema field for field. */
const expectedEvidence = {
  variantId: "gene-b-missense",
  structure: { bpPerTurn: 10, turnLengthA: 34, riseA: 3.4, diameterA: 20, pairing: "A" },
  replication: { stageOrder: ["UNWIND", "SYNTHESIZE", "COMPLETE"], newStrand: ["A", "A", "C", "C", "C", "T"], semiConservative: "A" },
  transcription: { mrna: [..."AUGGAACCCUACGGUUGA"] },
  translation: { aminoAcids: ["Met", "Glu", "Pro", "Tyr", "Gly", "Stop"], codonCombos: { n1: 4, n2: 16, n3: 64 } },
  mutation: { mutatedCodon: "GUA", mutatedAminoAcid: "Val", effect: "MISSENSE" },
  conclusion: { flow: "A", geneRole: "A" },
};

async function open(page: Page, view: "2d" | "3d" = "2d") {
  await page.addInitScript((mode) => localStorage.setItem("nexalab:lab-view:gene-expression", mode), view);
  await mockShell(page);
  await page.route("**/api/labs/gene-protein/runs", (route) => route.fulfill({ json: launch }));
  await page.goto("/labs/gene-protein?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await expect(page.locator(".k7-hud")).toBeVisible();
}

const station = (page: Page, name: string) => page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
const pick = async (page: Page, bases: string) => {
  for (const base of bases) await page.getByRole("button", { name: `Chọn ${base}`, exact: true }).click();
};

async function completeStations(page: Page) {
  await page.getByTestId("gene-bp-per-turn").fill("10");
  await page.getByTestId("gene-turn-length").fill("34");
  await page.getByTestId("gene-rise").fill("3,4");
  await page.getByTestId("gene-diameter").fill("20");
  await page.getByLabel(/A liên kết với T bằng 2 liên kết hydrogen/).check();

  await station(page, "Tái bản");
  await page.getByTestId("gene-unwind").click();
  await pick(page, "AACCCT");
  await page.getByTestId("gene-stage-1").selectOption("UNWIND");
  await page.getByTestId("gene-stage-2").selectOption("SYNTHESIZE");
  await page.getByTestId("gene-stage-3").selectOption("COMPLETE");
  await page.getByLabel(/Một mạch cũ của DNA mẹ/).check();

  await station(page, "Phiên mã");
  await pick(page, "AUGGAACCCUACGGUUGA");

  await station(page, "Dịch mã");
  for (const meaning of ["Met", "Glu", "Pro", "Tyr", "Gly", "Stop"]) {
    await page.getByTestId("gene-amino-select").selectOption(meaning);
    await page.getByTestId("gene-attach").click();
  }
  await page.getByTestId("gene-combo-1").fill("4");
  await page.getByTestId("gene-combo-2").fill("16");
  await page.getByTestId("gene-combo-3").fill("64");

  await station(page, "Đột biến");
  await page.getByTestId("gene-mutate").click();
  await page.getByTestId("gene-mutated-codon").fill("GUA");
  await page.getByTestId("gene-mutated-amino").selectOption("Val");
  await page.getByLabel("Đổi sang một amino acid khác.").check();

  await station(page, "Kết luận");
  await page.getByLabel("DNA (gene) → mRNA → protein → tính trạng").check();
  await page.getByLabel(/Gene mang thông tin quy định cấu trúc protein/).check();
}

test("launch pins the gene; the submitted evidence matches the server schema exactly and shows the server result", async ({ page }) => {
  const submissions: any[] = [];
  await open(page);
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: {
      id: "gene-attempt", verdict: "passed", simulationResult: {
        version: "1.0.0",
        observations: {
          replication: { correctBases: 6, totalBases: 6 },
          transcription: { correctBases: 18, totalBases: 18 },
          translation: { residuesRead: 5, reachedStop: true },
        },
        assessment: { score: 6, maximumScore: 6, criteria: {}, unmetCriteria: [], passed: true },
      },
    } } });
  });
  // The pinned gene drives the scene: gene B's mutation is A → T at position 5.
  await station(page, "Đột biến");
  await page.getByTestId("gene-mutate").click();
  await expect(page.locator(".k7-readout")).toContainText("vị trí 5 trên mạch mã hoá đổi A thành T");
  await page.getByTestId("gene-mutate").click();
  await station(page, "Cấu trúc DNA");

  const submit = page.getByTestId("lab-run-submit");
  await expect(submit).toBeDisabled();
  await completeStations(page);
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect.poll(() => submissions.length).toBe(1);
  const body = submissions[0];
  expect(body).toMatchObject({ contract: "lab-contract/1", runId: "gene-run", stateSchemaVersion: 1, evidenceSchemaVersion: 1 });
  expect(Object.keys(body).sort()).toEqual(["contract", "durationMs", "evidence", "evidenceSchemaVersion", "idempotencyKey", "runId", "stateSchemaVersion"]);
  expect(body.evidence).toEqual(expectedEvidence);

  const result = page.getByTestId("gene-result");
  await expect(result).toContainText("Em đã đạt tất cả tiêu chí.");
  await expect(result).toContainText("6 / 6");
  await expect(page.getByTestId("gene-result-observations")).toContainText("mRNA khi phiên mã: 18/18 nucleotide đúng.");
});

test("switching stations and 3D/2D views never changes the evidence (the scene only reads it)", async ({ page }) => {
  test.setTimeout(120000);
  const submissions: any[] = [];
  await open(page);
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: { id: "gene-attempt-2", verdict: "passed", simulationResult: { version: "1.0.0", assessment: { score: 6, maximumScore: 6, unmetCriteria: [], passed: true } } } } });
  });
  await completeStations(page);
  const toggle = page.locator(".lab-space-header").getByTestId("lab-renderer-toggle");
  for (const [index, name] of ["Tái bản", "Phiên mã", "Dịch mã", "Đột biến", "Cấu trúc DNA"].entries()) {
    await station(page, name);
    await toggle.getByRole("button", { name: "3D", exact: true }).click();
    // The first 3D visit starts at the lab bench; the microscope opens the molecular view, which then stays open.
    if (index === 0) {
      await expect(page.getByTestId("physics-stage")).toBeVisible();
      await page.getByTestId("gene-open-microscope").click();
    }
    await expect(page.getByTestId("molecular-stage")).toBeVisible({ timeout: 15000 });
    await toggle.getByRole("button", { name: "2D", exact: true }).click();
    await expect(page.getByTestId("k7-diagram-2d")).toBeVisible();
  }
  await page.getByTestId("lab-run-submit").click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].evidence).toEqual(expectedEvidence);
});

test("a needs-practice result lists the unmet criteria from the server", async ({ page }) => {
  await open(page);
  await page.route("**/api/attempts", (route) => route.fulfill({ status: 201, json: { attempt: {
    id: "gene-attempt-3", verdict: "needs_practice", simulationResult: {
      version: "1.0.0",
      observations: { replication: { correctBases: 6, totalBases: 6 }, transcription: { correctBases: 18, totalBases: 18 }, translation: { residuesRead: 3, reachedStop: true } },
      assessment: { score: 5, maximumScore: 6, unmetCriteria: ["translation:codons"], passed: false },
    },
  } } }));
  await completeStations(page);
  await page.getByTestId("lab-run-submit").click();
  const result = page.getByTestId("gene-result");
  await expect(result).toContainText("Em cần luyện thêm ở một số trạm.");
  await expect(result.locator("li[data-met=false]")).toHaveText(/R4 Dịch mã: Chưa đạt/);
  await expect(result.locator("li[data-met=false]")).toHaveCount(1);
});
