import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a local Vite port");
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

const port = Number(process.env.THUMBNAIL_CAPTURE_PORT ?? await findAvailablePort());
const baseUrl = process.env.THUMBNAIL_CAPTURE_URL ?? `http://127.0.0.1:${port}/tools/lab-thumbnail-capture/index.html`;
const outputDir = resolve("src/features/labs/assets/thumbnails");
const requestedLabIds = process.argv.slice(2);
const externalServer = Boolean(process.env.THUMBNAIL_CAPTURE_URL);

async function waitForServer(server, url) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Vite capture server exited with code ${server.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Timed out waiting for the Vite capture page at ${url}`);
}

async function encodeWebp(page, png, size, maxBytes) {
  return page.evaluate(async ({ base64, size, maxBytes }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = size[0];
    canvas.height = size[1];
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable for WebP conversion");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.74, 0.66, 0.58]) {
      const blob = await new Promise((resolveBlob, reject) => canvas.toBlob((result) => result ? resolveBlob(result) : reject(new Error("WebP encoding failed")), "image/webp", quality));
      if (blob.type !== "image/webp") throw new Error(`Expected image/webp, got ${blob.type || "unknown"}`);
      if (blob.size <= maxBytes) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return { base64: btoa(binary), size: blob.size, quality };
      }
    }
    throw new Error(`Thumbnail remains above ${maxBytes} bytes at the lowest accepted quality`);
  }, { base64: png.toString("base64"), size, maxBytes });
}

let vite;
let browser;
try {
  if (!externalServer) {
    vite = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
      stdio: "inherit",
      windowsHide: true,
    });
    await waitForServer(vite, baseUrl);
  }

  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }),
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
  await page.route("**/api/**", (route) => route.abort());
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const availableLabIds = await page.evaluate(() => document.documentElement.dataset.labThumbnailIds?.split(",").filter(Boolean) ?? []);
  if (!availableLabIds.length) throw new Error("Capture harness did not expose any lab scene fixtures");

  const isKit = (id) => id.startsWith("kit/");
  const labIds = requestedLabIds[0] === "--kit" ? availableLabIds.filter(isKit)
    : requestedLabIds.length ? requestedLabIds : availableLabIds.filter((id) => !isKit(id));
  const unknownIds = labIds.filter((labId) => !/^(?:kit\/[a-z-]+\/)?[\w-]+$/.test(labId) || !availableLabIds.includes(labId));
  if (unknownIds.length) throw new Error(`No capture scene registered for: ${unknownIds.join(", ")}`);
  for (const labId of labIds) {
    const size = isKit(labId) ? [512, 512] : [1280, 720];
    const outputLimitBytes = (isKit(labId) ? 30 : 120) * 1024;
    await page.goto(`${baseUrl}?lab=${encodeURIComponent(labId)}`, { waitUntil: "networkidle" });
    const stage = page.locator(`[data-lab-id="${labId}"]`);
    await stage.waitFor({ state: "visible" });
    await stage.locator("canvas").first().waitFor({ state: "visible" });
    await page.waitForTimeout(1400);
    const png = await stage.screenshot({ type: "png", animations: "disabled" });
    const webp = await encodeWebp(page, png, size, outputLimitBytes);
    const bytes = Buffer.from(webp.base64, "base64");
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP" || bytes.length > outputLimitBytes) {
      throw new Error(`${labId}: invalid or oversized WebP (${bytes.length} bytes)`);
    }
    const file = join(outputDir, `${labId}.webp`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, bytes);
    console.log(`${labId}: ${bytes.length} bytes, quality ${webp.quality} → ${file}`);
  }
} finally {
  await browser?.close();
  if (vite && vite.exitCode === null) vite.kill();
}
