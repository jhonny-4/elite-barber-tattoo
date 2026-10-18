#!/usr/bin/env node
/*
 * Control visual: capturas por ancho, desbordamiento horizontal y centrado.
 *
 * Uso:
 *   node scripts/qa/visual-qa.mjs --base http://127.0.0.1:3000 --path / --path /reservar \
 *     --widths 390,768,1440 --center ".section-heading,.button-row" --out /tmp/qa [--reduced] [--full]
 *
 * Requiere Playwright. Busca primero el paquete local y después instalaciones globales
 * conocidas. Con PLAYWRIGHT_CHROMIUM se puede indicar el ejecutable de Chromium.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const load = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    "playwright",
    "@playwright/test",
    "/opt/node22/lib/node_modules/playwright",
  ];
  for (const name of candidates) {
    try {
      return load(name);
    } catch {
      /* siguiente candidato */
    }
  }
  throw new Error("No se encontró Playwright. Instálalo o ajusta la ruta.");
}

function parseArgs(argv) {
  const args = { paths: [], widths: [390, 768, 1440], center: [], full: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = () => argv[++i];
    if (key === "--base") args.base = next();
    else if (key === "--path") args.paths.push(next());
    else if (key === "--widths") args.widths = next().split(",").map(Number);
    else if (key === "--center")
      args.center.push(
        ...next()
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    else if (key === "--out") args.out = next();
    else if (key === "--reduced") args.reduced = true;
    else if (key === "--full") args.full = true;
    else if (key === "--tolerance") args.tolerance = Number(next());
  }
  args.base ??= "http://127.0.0.1:3000";
  args.out ??= path.join(process.cwd(), ".qa");
  args.tolerance ??= 2;
  if (!args.paths.length) args.paths.push("/");
  return args;
}

async function settle(page) {
  // Recorre la página para disparar cargas diferidas y revelados. Si el servidor de
  // desarrollo recarga la página a mitad de recorrido, espera y vuelve a intentarlo.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await scrollThrough(page);
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
  }
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
}

async function measure(page, selectors, tolerance) {
  return page.evaluate(
    ({ selectors, tolerance }) => {
      const out = [];
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== "hidden" &&
          s.display !== "none"
        );
      };
      const containerOf = (el) => {
        let node = el.parentElement;
        while (node && node !== document.body) {
          const s = getComputedStyle(node);
          if (s.display !== "contents" && node.getBoundingClientRect().width > 0)
            return node;
          node = node.parentElement;
        }
        return document.body;
      };
      for (const selector of selectors) {
        const nodes = [...document.querySelectorAll(selector)].filter(visible);
        nodes.slice(0, 40).forEach((el, index) => {
          const c = containerOf(el);
          const cs = getComputedStyle(c);
          const cr = c.getBoundingClientRect();
          const left = cr.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
          const right = cr.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
          const r = el.getBoundingClientRect();
          const delta = Math.round((r.left - left - (right - r.right)) * 10) / 10;
          const textAlign = getComputedStyle(el).textAlign;
          const fullWidth = Math.abs(r.width - (right - left)) <= tolerance;
          const textCentered =
            !fullWidth || ["center", "-webkit-center"].includes(textAlign);
          out.push({
            selector,
            index,
            delta,
            width: Math.round(r.width),
            container: Math.round(right - left),
            textAlign,
            ok: Math.abs(delta) <= tolerance && textCentered,
          });
        });
        if (!nodes.length) out.push({ selector, missing: true, ok: true });
      }
      return out;
    },
    { selectors, tolerance },
  );
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });
  const { chromium } = loadPlaywright();
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM ||
    (fs.existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
      ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
      : undefined);
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const report = [];
  let failures = 0;
  for (const route of args.paths) {
    for (const width of args.widths) {
      const page = await browser.newPage({
        viewport: { width, height: width < 600 ? 844 : width < 1100 ? 1024 : 900 },
        deviceScaleFactor: 1,
      });
      if (args.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e.message || e)));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(args.base + route, { waitUntil: "networkidle", timeout: 60000 }).catch(
        (e) => errors.push("goto: " + e.message),
      );
      await settle(page);
      const retrying = async (fn) => {
        for (let attempt = 0; ; attempt++) {
          try {
            return await fn();
          } catch (error) {
            if (attempt === 2) throw error;
            await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(800);
          }
        }
      };
      const overflow = await retrying(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      );
      const centering = args.center.length
        ? await retrying(() => measure(page, args.center, args.tolerance))
        : [];
      const slug = (route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home") +
        `-${width}${args.reduced ? "-reduced" : ""}`;
      const file = path.join(args.out, `${slug}.png`);
      await page.screenshot({ path: file, fullPage: args.full });
      const bad = centering.filter((c) => !c.ok);
      if (overflow > 0 || bad.length) failures++;
      report.push({ route, width, overflow, screenshot: file, offCenter: bad, errors });
      console.log(
        `${route} @${width}px  overflow=${overflow}px  descentrados=${bad.length}  errores=${errors.length}  → ${file}`,
      );
      for (const b of bad)
        console.log(
          `   ✗ ${b.selector}[${b.index}] delta=${b.delta}px ancho=${b.width}/${b.container} text-align=${b.textAlign}`,
        );
      for (const e of errors.slice(0, 5)) console.log(`   ! ${e}`);
      await page.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(args.out, "report.json"), JSON.stringify(report, null, 2));
  process.exitCode = failures ? 1 : 0;
})().catch((error) => {
  console.error(error);
  process.exit(2);
});
