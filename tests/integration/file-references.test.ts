import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import {
  execute,
  readReference,
  readShared,
} from "../../src/server/demo/store/repository.ts";
import { GET as getReference } from "../../src/app/api/demo/reference/[id]/route.ts";
import { GET as getDemo } from "../../src/app/api/demo/route.ts";
import { PNG_BASE64, PNG_DATA_URL } from "../helpers/fake-blobs.ts";

const folder = await mkdtemp(join(tmpdir(), "elite-ref-test-"));
process.env.ELITE_DEMO_DIR = folder;
delete process.env.ELITE_STORE;
delete process.env.NETLIFY_BLOBS_CONTEXT;
after(async () => {
  assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
  assert.ok(basename(folder).startsWith("elite-ref-test-"));
  await rm(folder, { recursive: true, force: true });
});

const tattoo = {
  name: "Cliente ficticio",
  phone: "3000000000",
  idea: "Idea de prueba con detalle suficiente",
  placement: "Espalda",
  size: "12 cm",
  referenceName: "idea.png",
  referenceDataUrl: PNG_DATA_URL,
};
const files = () => readdir(join(folder, "references"));

test("archivo: la imagen va a references/<id>.bin, nunca al estado, y reset la borra", async () => {
  const command = { type: "tattoo.create" as const, input: tattoo };
  const created = await execute(command, "file-ref-key-0001");
  const raw = await readFile(join(folder, "state.json"), "utf8");
  assert.ok(!raw.includes("data:image"));
  const url = created.state.requests[0].referenceUrl ?? "";
  const id = url.split("/").at(-1) ?? "";
  assert.match(url, /^\/api\/demo\/reference\/[0-9a-f-]{36}$/);
  assert.deepEqual(await files(), [`${id}.bin`]);

  const image = await getReference(new Request(`http://localhost${url}`, { headers: { "x-elite-role": "dueno" } }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(image.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(
    Buffer.from(await image.arrayBuffer()),
    Buffer.from(PNG_BASE64, "base64"),
  );

  const demo = await getDemo(new Request("http://localhost:3000/api/demo"));
  assert.equal(demo.headers.get("x-elite-store"), "file");
  assert.ok(!(await demo.text()).includes("data:image"));

  // Reintento con la misma clave y comando inválido: ninguna imagen huérfana.
  await execute(command, "file-ref-key-0001");
  await assert.rejects(
    execute(
      { type: "tattoo.create", input: { ...tattoo, phone: "x" } },
      "file-ref-key-0002",
    ),
    /teléfono/,
  );
  assert.equal((await files()).length, 1);

  await execute({ type: "reset" }, "file-reset-key-0001");
  assert.deepEqual(await files(), []);
  assert.equal(await readReference(id), null);
  assert.equal((await readShared()).requests.length, 0);
});
