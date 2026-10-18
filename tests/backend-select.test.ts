import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getDemoBackend,
  hasNetlifyBlobsContext,
  selectBackendKind,
  setDemoBackendForTesting,
} from "../src/server/demo/store/backend.ts";
import {
  createNetlifyBlobsBackend,
  netlifyBlobsSettings,
} from "../src/server/demo/store/blobs-backend.ts";
import { storeInfo } from "../src/server/demo/store/repository.ts";
import { GET as getEvents } from "../src/app/api/demo/events/route.ts";

const context = Buffer.from(
  JSON.stringify({ siteID: "sitio", token: "ficticio", edgeURL: "https://edge.invalid" }),
).toString("base64");

test("selección: archivo por defecto y Netlify Blobs cuando existe su contexto", () => {
  assert.equal(selectBackendKind({}, {}), "file");
  assert.equal(
    selectBackendKind({ NETLIFY_BLOBS_CONTEXT: context }, {}),
    "netlify-blobs",
  );
  assert.equal(
    selectBackendKind({}, { netlifyBlobsContext: context }),
    "netlify-blobs",
  );
  assert.equal(
    selectBackendKind(
      {},
      {
        Netlify: {
          env: {
            get: (key) => (key === "NETLIFY_BLOBS_CONTEXT" ? context : undefined),
          },
        },
      },
    ),
    "netlify-blobs",
  );
  assert.equal(hasNetlifyBlobsContext({}, { netlifyBlobsContext: "" }), false);
  assert.equal(
    hasNetlifyBlobsContext(
      {},
      {
        Netlify: {
          env: {
            get: () => {
              throw new Error("fuera del runtime");
            },
          },
        },
      },
    ),
    false,
  );
});

test("selección: ELITE_STORE fuerza el backend y rechaza valores desconocidos", () => {
  assert.equal(
    selectBackendKind({ ELITE_STORE: "file", NETLIFY_BLOBS_CONTEXT: context }, {}),
    "file",
  );
  assert.equal(
    selectBackendKind({ ELITE_STORE: " Netlify-Blobs " }, {}),
    "netlify-blobs",
  );
  assert.throws(
    () => selectBackendKind({ ELITE_STORE: "postgres" }, {}),
    /ELITE_STORE="postgres" no es válido/,
  );
});

test("selección: Netlify Blobs aísla cada despliegue salvo ELITE_BLOBS_SCOPE=site", () => {
  assert.deepEqual(netlifyBlobsSettings({}), {
    scope: "deploy",
    base: "elite-demo",
  });
  assert.deepEqual(
    netlifyBlobsSettings({ ELITE_BLOBS_SCOPE: "site", ELITE_BLOBS_STORE: "elite-prod" }),
    { scope: "site", base: "elite-prod" },
  );
  assert.throws(
    () => netlifyBlobsSettings({ ELITE_BLOBS_SCOPE: "global" }),
    /ELITE_BLOBS_SCOPE/,
  );
  assert.throws(
    () => netlifyBlobsSettings({ ELITE_BLOBS_STORE: "Elite/Prod" }),
    /ELITE_BLOBS_STORE/,
  );
  // Crear el backend no conecta con Netlify: los almacenes se abren en cada operación.
  const backend = createNetlifyBlobsBackend({});
  assert.equal(backend.kind, "netlify-blobs");
  assert.equal(backend.singleProcess, false);
});

test("selección: el entorno del proceso decide el backend y SSE solo existe con archivo", async () => {
  const saved = {
    store: process.env.ELITE_STORE,
    context: process.env.NETLIFY_BLOBS_CONTEXT,
  };
  try {
    delete process.env.ELITE_STORE;
    delete process.env.NETLIFY_BLOBS_CONTEXT;
    setDemoBackendForTesting(undefined);
    assert.deepEqual(storeInfo(), { kind: "file", singleProcess: true });
    const controller = new AbortController();
    const live = getEvents(
      new Request("http://localhost/api/demo/events", {
        signal: controller.signal,
      }),
    );
    assert.equal(live.status, 200);
    assert.equal(live.headers.get("content-type"), "text/event-stream");
    controller.abort();
    await live.body?.cancel();

    process.env.NETLIFY_BLOBS_CONTEXT = context;
    assert.deepEqual(storeInfo(), {
      kind: "netlify-blobs",
      singleProcess: false,
    });
    const serverless = getEvents(new Request("http://localhost/api/demo/events"));
    assert.equal(serverless.status, 204);
    assert.equal(serverless.body, null);

    process.env.ELITE_STORE = "file";
    assert.equal(getDemoBackend().kind, "file");
    process.env.ELITE_STORE = "otro";
    assert.equal(
      getEvents(new Request("http://localhost/api/demo/events")).status,
      204,
    );
  } finally {
    if (saved.store === undefined) delete process.env.ELITE_STORE;
    else process.env.ELITE_STORE = saved.store;
    if (saved.context === undefined) delete process.env.NETLIFY_BLOBS_CONTEXT;
    else process.env.NETLIFY_BLOBS_CONTEXT = saved.context;
  }
});
