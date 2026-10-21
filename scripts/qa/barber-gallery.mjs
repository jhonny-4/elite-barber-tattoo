// Solo lectura: comprueba publicación, atribución, imágenes y streaming de los videos.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require("../../var/qa-tools/node_modules/playwright");
const base = (process.argv[2] ?? "https://elite-barber-tatto.com").replace(/\/$/, "");
const published = [];
for (const [slug, name, photos, videos] of [["nelson", "Nelson", 7, 9], ["ivan", "Ivan", 3, 5]]) {
  const response = await fetch(`${base}/api/galeria?barbero=${slug}`, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200);
  const { items } = await response.json();
  assert.equal(items.filter((i) => i.kind === "foto").length, photos);
  assert.equal(items.filter((i) => i.kind === "video").length, videos);
  for (const item of items) {
    assert.equal(item.barberName, name);
    const image = await fetch(item.kind === "foto" ? item.url : item.posterUrl, { method: "HEAD", signal: AbortSignal.timeout(30_000) });
    assert.equal(image.status, 200);
    assert.match(image.headers.get("content-type"), /image\/webp/);
    if (item.kind === "video") {
      const video = await fetch(new URL(item.url, base), { headers: { Range: "bytes=0-31" }, signal: AbortSignal.timeout(30_000) });
      assert.equal(video.status, 206);
      assert.match(video.headers.get("content-range"), /^bytes 0-31\/\d+$/);
      assert.equal((await video.arrayBuffer()).byteLength, 32);
    }
  }
  published.push(...items);
  console.log(`${name}: ${photos} fotos y ${videos} videos disponibles con autor correcto.`);
}
await mkdir("var/qa-tools", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const gallery = page.locator("#galeria");
    await gallery.locator(".gallery-item[data-barber-work]").first().waitFor({ timeout: 30_000 });
    await gallery.getByRole("button", { name: /^Barbería/ }).click();
    const expand = gallery.getByRole("button", { name: /^Ver todos los trabajos/ });
    if (await expand.isVisible()) await expand.click();
    assert.equal(await gallery.locator(".gallery-item[data-barber-work]").count(), 24);
    for (const name of ["Nelson", "Ivan"]) {
      const author = gallery.locator(".gallery-kind-author").filter({ hasText: name }).first();
      await author.scrollIntoViewIfNeeded();
      assert.equal(await author.isVisible(), true);
    }
    const firstVideo = published.find((i) => i.kind === "video");
    await gallery.locator(`[data-id="published-${firstVideo.id}"] .gallery-card`).click();
    const dialog = page.locator("dialog[open]");
    await dialog.waitFor();
    assert.ok((await dialog.textContent()).includes(firstVideo.barberName));
    const video = dialog.locator("video").first();
    await video.evaluate(async (element) => { element.muted = true; await element.play(); });
    await page.waitForFunction(() => {
      const video = document.querySelector("dialog[open] video");
      return video && video.currentTime > 0 && video.readyState >= 2;
    }, null, { timeout: 30_000 });
    await page.screenshot({ path: `var/qa-tools/barber-gallery-video-${width}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await gallery.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Desbordamiento horizontal");
    await gallery.screenshot({ path: `var/qa-tools/barber-gallery-${width}.png` });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Galería y reproducción verificadas a ${width}px.`);
  }
} finally { await browser.close(); }
