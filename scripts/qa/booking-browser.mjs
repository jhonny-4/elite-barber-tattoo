import { createRequire } from "node:module";
const load=createRequire(import.meta.url);
const { chromium }=load("../../var/qa-tools/node_modules/playwright");
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] ?? "http://127.0.0.1:3011";
await mkdir("var/qa-tools", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("Error de página:", e.message);
    });
    await page.goto(
      `${base}/reservar?profesional=${width === 1440 ? "barbero-2" : "jean-carlos"}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    await page.locator(".bk-pro").filter({ hasText: "Jeancarlos" }).waitFor();
    for (const name of ["Ivan", "Jeancarlos", "Nelson"])
      assert.ok(
        (await page.locator(".bk-options-pros").textContent()).includes(name),
      );
    assert.equal(
      await page.locator('input[value="jean-carlos"]').isChecked(),
      true,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Desbordamiento en servicio",
    );
    await page.screenshot({
      path: `var/qa-tools/reserva-servicio-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Elegir fecha y hora" }).click();
    await page
      .locator('[data-slot]:not([aria-disabled="true"])')
      .first()
      .waitFor();
    await page
      .locator('[data-slot]:not([aria-disabled="true"])')
      .first()
      .click();
    await page.screenshot({
      path: `var/qa-tools/reserva-horario-${width}.png`,
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Desbordamiento en calendario",
    );
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.locator("#bk-name").waitFor();
    assert.deepEqual(errors, [], "Errores JavaScript en reserva");
    console.log(
      `Reserva ${width}px: nombres, profesional preseleccionado, calendario, horario y contacto aprobados; sin confirmar cita.`,
    );
    await page.close();
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await page.goto(`${base}/jean-carlos`, { waitUntil: "domcontentloaded" });
  const gallery = page.locator("#portafolio");
  await gallery.locator(".gallery-card").first().waitFor();
  assert.equal(
    (await gallery.innerText()).includes("capturas de referencia"),
    false,
  );
  await gallery.locator(".gallery-card").first().click();
  await page.locator("dialog[open]").waitFor();
  assert.ok(
    (await page.locator("dialog[open] .lightbox-note").innerText()).includes(
      "Virgen",
    ),
  );
  await page.screenshot({ path: "var/qa-tools/galeria-real.png" });
  console.log("Galería: fotografía real y descripción específica verificadas.");
} catch (e) {
  const pages = browser.contexts().flatMap((c) => c.pages());
  if (pages[0]) {
    await pages[0].screenshot({
      path: "var/qa-tools/reserva-fallo.png",
      fullPage: true,
    });
    console.log(
      "Pantalla:",
      (await pages[0].locator("body").innerText()).slice(0, 1300),
    );
  }
  throw e;
} finally {
  await browser.close();
}
