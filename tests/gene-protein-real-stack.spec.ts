import { expect, test } from "@playwright/test";

// Independent known-answer fixtures keep the FE suite runnable without a BE checkout.
const geneA = {
  replication: { newStrand: "TCGGAT" },
  mrna: "AUGUUCGGAUGGCAUUAA",
  aminoAcids: ["Met", "Phe", "Gly", "Trp", "His", "Stop"],
};
const cases: Record<
  string,
  typeof geneA & {
    mutation: {
      codon: string;
      aminoAcid: string;
      effect: "SILENT" | "MISSENSE" | "NONSENSE";
    };
  }
> = {
  "gene-a-missense": {
    ...geneA,
    mutation: { codon: "UUA", aminoAcid: "Leu", effect: "MISSENSE" },
  },
  "gene-a-nonsense": {
    ...geneA,
    mutation: { codon: "UGA", aminoAcid: "Stop", effect: "NONSENSE" },
  },
  "gene-a-silent": {
    ...geneA,
    mutation: { codon: "GGG", aminoAcid: "Gly", effect: "SILENT" },
  },
  "gene-b-missense": {
    replication: { newStrand: "AACCCT" },
    mrna: "AUGGAACCCUACGGUUGA",
    aminoAcids: ["Met", "Glu", "Pro", "Tyr", "Gly", "Stop"],
    mutation: { codon: "GUA", aminoAcid: "Val", effect: "MISSENSE" },
  },
};

// No route mocks: opt in only against the guarded isolated FL27 database/API.
test.skip(
  process.env.FL27_REAL_STACK !== "1",
  "requires isolated full-stack fixture",
);
test("FL27 browser → API → DB: pinned gene, six stations, scored and persisted result", async ({
  page,
}) => {
  test.setTimeout(120000);
  const api = process.env.TEST_API ?? "http://127.0.0.1:4127/api";
  const target = new URL(api);
  expect(["localhost", "127.0.0.1"]).toContain(target.hostname);
  const database = new URL(
    process.env.NEXALAB_ISOLATED_DATABASE_URL ?? "http://missing",
  );
  expect(["localhost", "127.0.0.1"]).toContain(database.hostname);
  expect(database.pathname).toBe("/nexalab_fl27_isolated");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const login = await page.request.post(`${api}/auth/student/login`, {
    data: {
      username: "student.active",
      password: process.env.FL27_STUDENT_PASSWORD,
    },
  });
  expect(login.ok(), await login.text()).toBe(true);
  await page.addInitScript(() =>
    localStorage.setItem("nexalab:lab-view:gene-expression", "2d"),
  );
  const launched = page.waitForResponse(
    (r) =>
      r.url().endsWith("/labs/gene-protein/runs") &&
      r.request().method() === "POST",
  );
  await page.goto("/labs/gene-protein?assignmentId=assignment-fl27-fullstack");
  await page.getByTestId("lab-session-start").click();
  const response = await launched;
  expect(response.status()).toBe(201);
  const launch = await response.json();
  expect(launch).toMatchObject({
    modelRef: "gene-expression@1.0.0",
    rendererKey: "gene-expression",
    versionBinding: "ASSIGNMENT_PINNED",
  });
  const variantId = launch.runtimeParams.variantId;
  expect(Object.keys(cases)).toContain(variantId);
  const truth = cases[variantId];
  const station = (name: string) =>
    page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
  const pick = async (bases: string | readonly string[]) => {
    for (const base of bases)
      await page
        .getByRole("button", { name: `Chọn ${base}`, exact: true })
        .click();
  };
  for (const [id, value] of [
    ["gene-bp-per-turn", "10"],
    ["gene-turn-length", "34"],
    ["gene-rise", "3,4"],
    ["gene-diameter", "20"],
  ])
    await page.getByTestId(id).fill(value);
  await page.getByLabel(/A liên kết với T bằng 2 liên kết hydrogen/).check();
  await station("Tái bản");
  await page.getByTestId("gene-unwind").click();
  await pick(truth.replication.newStrand);
  for (const [i, value] of ["UNWIND", "SYNTHESIZE", "COMPLETE"].entries())
    await page.getByTestId(`gene-stage-${i + 1}`).selectOption(value);
  await page.getByLabel(/Một mạch cũ của DNA mẹ/).check();
  await station("Phiên mã");
  await pick(truth.mrna);
  await station("Dịch mã");
  for (const amino of truth.aminoAcids) {
    await page.getByTestId("gene-amino-select").selectOption(amino);
    await page.getByTestId("gene-attach").click();
  }
  for (const [i, value] of ["4", "16", "64"].entries())
    await page.getByTestId(`gene-combo-${i + 1}`).fill(value);
  await station("Đột biến");
  await page.getByTestId("gene-mutate").click();
  await page.getByTestId("gene-mutated-codon").fill(truth.mutation.codon);
  await page
    .getByTestId("gene-mutated-amino")
    .selectOption(truth.mutation.aminoAcid);
  const effects = {
    SILENT: "Amino acid không đổi.",
    MISSENSE: "Đổi sang một amino acid khác.",
    NONSENSE: "Thành codon kết thúc, chuỗi polypeptide ngắn lại.",
  };
  await page
    .getByLabel(effects[truth.mutation.effect], { exact: true })
    .check();
  await station("Kết luận");
  await page.getByLabel("DNA (gene) → mRNA → protein → tính trạng").check();
  await page
    .getByLabel(/Gene mang thông tin quy định cấu trúc protein/)
    .check();
  const submitted = page.waitForResponse(
    (r) => r.url().endsWith("/attempts") && r.request().method() === "POST",
  );
  await page.getByTestId("lab-run-submit").click();
  const result = await submitted;
  expect(result.status()).toBe(201);
  const { attempt } = await result.json();
  expect(attempt.verdict).toBe("passed");
  expect(attempt.simulationResult.assessment).toMatchObject({
    score: 6,
    maximumScore: 6,
    passed: true,
  });
  expect(attempt.simulationResult._execution.params).toEqual({ variantId });
  await expect(page.getByTestId("gene-result")).toContainText("6 / 6");
  // The browser refreshes the session on entry; use its current token after rotation.
  const history = await page.request.get(`${api}/attempts`, {
    headers: { Authorization: result.request().headers().authorization },
  });
  expect(history.ok(), await history.text()).toBe(true);
  expect(await history.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: attempt.id, verdict: "passed" }),
    ]),
  );
  expect(errors).toEqual([]);
});
