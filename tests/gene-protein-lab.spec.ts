import { expect, test, type Page } from "@playwright/test";

// FL-27 gene-to-protein private prototype on its dev preview: local state only, nothing is launched or graded.
// Logic runs on the 2D read view (headless WebGL is slow); one test opts into 3D.
async function open(page: Page, view: "2d" | "3d" = "2d") {
  await page.addInitScript((mode) => localStorage.setItem("nexalab:lab-view:gene-expression", mode), view);
  await page.goto("/dev/lab-kits/gene-protein");
  // The activity section itself has no box: its stage and guide panel are positioned over the Lab Space.
  await expect(page.locator(".k7-hud")).toBeVisible();
}

const station = (page: Page, name: string) => page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();

async function pick(page: Page, bases: string) {
  for (const base of bases) await page.getByRole("button", { name: `Chọn ${base}`, exact: true }).click();
}

async function chooseAmino(page: Page, meaning: string) {
  await page.getByTestId("gene-amino-select").selectOption(meaning);
  await page.getByTestId("gene-attach").click();
}

test("learner works through all six stations and the draft becomes ready", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("k7-diagram-2d")).toBeVisible();

  await page.getByTestId("gene-bp-per-turn").fill("10");
  await page.getByTestId("gene-turn-length").fill("34");
  await page.getByTestId("gene-rise").fill("3,4");
  await page.getByTestId("gene-diameter").fill("20");
  await page.getByLabel(/A liên kết với T bằng 2 liên kết hydrogen/).check();

  await station(page, "Tái bản");
  await page.getByTestId("gene-unwind").click();
  await pick(page, "TCGGAT");
  await page.getByTestId("gene-complete").click();
  await expect(page.locator(".k7-readout")).toContainText("Đã tạo hai DNA con");
  await page.getByTestId("gene-stage-1").selectOption("UNWIND");
  await page.getByTestId("gene-stage-2").selectOption("SYNTHESIZE");
  await page.getByTestId("gene-stage-3").selectOption("COMPLETE");
  await page.getByLabel(/Một mạch cũ của DNA mẹ/).check();

  await station(page, "Phiên mã");
  // RNA has no T: the picker offers A, U, G, C only, and letter keys work inside it.
  await expect(page.getByRole("button", { name: "Chọn T", exact: true })).toHaveCount(0);
  await pick(page, "AUGUUC");
  await page.getByRole("button", { name: "Chọn G", exact: true }).focus();
  for (const key of "GGAUGGCAUUAA") await page.keyboard.press(key.toLowerCase());
  await expect(page.locator(".k7-readout")).toHaveText("mRNA: 18/18 nucleotide.");

  await station(page, "Dịch mã");
  for (const meaning of ["Met", "Phe", "Gly", "Trp", "His", "Stop"]) await chooseAmino(page, meaning);
  await expect(page.getByText("Ribosome đã gặp codon kết thúc")).toBeVisible();
  await page.getByTestId("gene-combo-1").fill("4");
  await page.getByTestId("gene-combo-2").fill("16");
  await page.getByTestId("gene-combo-3").fill("64");

  await station(page, "Đột biến");
  await page.getByTestId("gene-mutate").click();
  await expect(page.locator(".k7-readout")).toContainText("vị trí 6");
  await page.getByTestId("gene-mutated-codon").fill("uua");
  await expect(page.getByTestId("gene-mutated-codon")).toHaveValue("UUA");
  await page.getByTestId("gene-mutated-amino").selectOption("Leu");
  await page.getByLabel("Đổi sang một amino acid khác.").check();

  await station(page, "Kết luận");
  await page.getByLabel("DNA (gene) → mRNA → protein → tính trạng").check();
  await page.getByLabel(/Gene mang thông tin quy định cấu trúc protein/).check();
  await expect(page.getByTestId("gene-readiness")).toHaveText("Em đã trả lời đủ các trạm.");
  await expect(page.getByRole("tab", { name: /Đủ câu trả lời/ })).toHaveCount(6);
});

test("translation needs a complete mRNA and the codon table marks the codon being read", async ({ page }) => {
  await open(page);
  await station(page, "Dịch mã");
  await expect(page.getByText("Hoàn thành mRNA ở trạm Phiên mã trước khi dịch mã.")).toBeVisible();
  await station(page, "Phiên mã");
  await pick(page, "AUGUUCGGAUGGCAUUAA");
  await station(page, "Dịch mã");
  await expect(page.locator(".k7-codon-table li[aria-current=true]")).toContainText("AUG");
  await chooseAmino(page, "Met");
  await expect(page.locator(".k7-codon-table li[aria-current=true]")).toContainText("UUC");
});

test("the server-pinned variant replaces a draft made for another gene", async ({ page }) => {
  await open(page);
  await station(page, "Phiên mã");
  await pick(page, "AUG");
  await page.getByTestId("gene-variant").selectOption("gene-b-missense");
  await expect(page.locator(".k7-readout")).toHaveText("mRNA: 0/18 nucleotide.");
  await station(page, "Đột biến");
  await page.getByTestId("gene-mutate").click();
  await expect(page.locator(".k7-readout")).toContainText("vị trí 5 trên mạch mã hoá đổi A thành T");
});

test("3D opens in the lab room; the microscope leads into the molecular view and back", async ({ page }) => {
  test.setTimeout(90000);
  await open(page, "3d");
  // Bench first: the shared room with the K7 microscope, PCR machine and tube rack.
  await expect(page.getByTestId("physics-stage")).toBeVisible();
  await expect(page.locator(".k7-instruction")).toContainText("Bấm vào kính hiển vi");
  await page.getByTestId("gene-open-microscope").click();
  await expect(page.getByTestId("molecular-stage")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".lab-space canvas")).toHaveCount(1);
  await expect(page.locator(".k7-instruction")).toContainText("Xoay chuỗi xoắn kép");
  // Ball-and-stick view with an element legend (colour is never the only cue).
  await page.getByTestId("gene-model-atomic").click();
  await expect(page.getByTestId("gene-model-atomic")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("gene-atom-legend")).toContainText("O oxi");
  await page.getByTestId("gene-model-schematic").click();
  await expect(page.getByTestId("gene-atom-legend")).toHaveCount(0);
  await page.getByTestId("gene-back-to-bench").click();
  await expect(page.getByTestId("physics-stage")).toBeVisible();
  await page.getByTestId("gene-open-microscope").click();
  await expect(page.getByTestId("molecular-stage")).toBeVisible({ timeout: 15000 });
  const toggle = page.locator(".lab-space-header").getByTestId("lab-renderer-toggle");
  await toggle.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.getByTestId("k7-diagram-2d")).toBeVisible();
  await expect(page.getByTestId("molecular-stage")).toHaveCount(0);
});
