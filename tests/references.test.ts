import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeReferenceDataUrl,
  findReferenceSource,
  MAX_STORED_REFERENCES,
  referenceIdFromUrl,
  referenceUrlFor,
  sniffImageType,
  toPublicState,
} from "../src/server/demo/store/references.ts";
import {
  applyCommand,
  freshSharedState,
} from "../src/server/demo/store/commands.ts";
import { createDemoId } from "../src/domain/id.ts";

// PNG real de 1×1 px y cabeceras mínimas de JPEG y WebP (solo la firma importa).
export const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x1a, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
]);
const dataUrl = (type: string, bytes: Buffer | string) =>
  `data:${type};base64,${typeof bytes === "string" ? bytes : bytes.toString("base64")}`;

const tattoo = {
  name: "Cliente ficticio",
  phone: "3000000000",
  idea: "Idea de prueba con detalle",
  placement: "Brazo",
  size: "10 cm",
  referenceName: "idea.png",
};

test("referencias: acepta JPEG, PNG y WebP cuya firma coincide con el tipo declarado", () => {
  const png = decodeReferenceDataUrl(dataUrl("image/png", PNG_BASE64));
  assert.equal(png.contentType, "image/png");
  assert.equal(png.bytes.length, 70);
  assert.equal(
    decodeReferenceDataUrl(dataUrl("image/jpeg", JPEG)).contentType,
    "image/jpeg",
  );
  assert.equal(
    decodeReferenceDataUrl(dataUrl("image/webp", WEBP)).contentType,
    "image/webp",
  );
  assert.equal(sniffImageType(new Uint8Array([1, 2, 3, 4])), null);
});

test("referencias: rechaza tipos no admitidos, firmas falsas, base64 inválido y más de 1 MB", () => {
  const tooBig = Buffer.concat([
    Buffer.from(PNG_BASE64, "base64"),
    Buffer.alloc(1024 * 1024),
  ]);
  for (const value of [
    dataUrl("image/png", JPEG), // tipo declarado distinto de la firma
    dataUrl("image/gif", Buffer.from("GIF89a")),
    dataUrl("image/svg+xml", Buffer.from("<svg onload=alert(1)>")),
    "data:image/png;base64,iVBORw0KGgo", // longitud no múltiplo de 4
    "data:image/png;base64,iVBO*w0KGgo=", // carácter inválido
    dataUrl("image/png", tooBig),
    `data:image/png;base64,${"A".repeat(1_450_001)}`,
    "https://example.invalid/idea.png",
    42,
  ])
    assert.throws(
      () => decodeReferenceDataUrl(value),
      /Referencia inválida o mayor a 1 MB/,
    );
});

test("referencias: las respuestas nunca incluyen data URLs ni rutas ajenas", () => {
  const legacyId = createDemoId(),
    storedId = createDemoId();
  const state = freshSharedState();
  state.requests.push(
    {
      ...tattoo,
      id: legacyId,
      status: "pendiente",
      referenceDataUrl: dataUrl("image/png", PNG_BASE64),
    },
    {
      ...tattoo,
      id: createDemoId(),
      status: "pendiente",
      referenceUrl: referenceUrlFor(storedId),
    },
    {
      ...tattoo,
      id: createDemoId(),
      status: "pendiente",
      referenceUrl: "https://example.invalid/rastreo.png",
    },
  );
  const view = toPublicState(state);
  assert.ok(!JSON.stringify(view).includes("data:image"));
  assert.ok(!JSON.stringify(view).includes("example.invalid"));
  assert.equal(view.requests[0].referenceUrl, referenceUrlFor(legacyId));
  assert.equal(view.requests[1].referenceUrl, referenceUrlFor(storedId));
  assert.equal(view.requests[2].referenceUrl, undefined);
  // El estado guardado no se modifica y sin cambios se devuelve el mismo objeto.
  assert.ok(state.requests[0].referenceDataUrl);
  const clean = freshSharedState();
  assert.equal(toPublicState(clean), clean);
  assert.deepEqual(findReferenceSource(state, storedId), { kind: "stored" });
  assert.equal(findReferenceSource(state, legacyId)?.kind, "legacy");
  assert.equal(findReferenceSource(state, createDemoId()), null);
  assert.equal(referenceIdFromUrl("/api/demo/reference/../state.json"), null);
});

test("referencias: el comando solo guarda campos conocidos y una ruta propia, con límite", () => {
  assert.throws(
    () =>
      applyCommand(freshSharedState(), {
        type: "tattoo.create",
        input: { ...tattoo, referenceUrl: "javascript:alert(1)" },
      }),
    /Referencia inválida/,
  );
  const url = referenceUrlFor(createDemoId());
  const created = applyCommand(freshSharedState(), {
    type: "tattoo.create",
    input: {
      ...tattoo,
      referenceUrl: url,
      referenceDataUrl: dataUrl("image/png", PNG_BASE64),
      ...({ status: "cerrada", extra: "x".repeat(10) } as object),
    },
  }).state.requests[0];
  assert.equal(created.referenceUrl, url);
  assert.equal(created.status, "pendiente");
  assert.equal(created.referenceDataUrl, undefined);
  assert.equal((created as unknown as { extra?: string }).extra, undefined);

  let state = freshSharedState();
  for (let i = 0; i < MAX_STORED_REFERENCES; i++)
    state = applyCommand(state, {
      type: "tattoo.create",
      input: {
        ...tattoo,
        phone: `30000${String(i).padStart(5, "0")}`,
        referenceUrl: referenceUrlFor(createDemoId()),
      },
    }).state;
  assert.throws(
    () =>
      applyCommand(state, {
        type: "tattoo.create",
        input: { ...tattoo, referenceUrl: referenceUrlFor(createDemoId()) },
      }),
    /límite de imágenes/,
  );
  // Sin imagen la solicitud sigue siendo posible.
  assert.equal(
    applyCommand(state, { type: "tattoo.create", input: tattoo }).state.requests
      .length,
    MAX_STORED_REFERENCES + 1,
  );
});
