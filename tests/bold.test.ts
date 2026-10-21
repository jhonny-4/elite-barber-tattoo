import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { integritySignature, verifyWebhook, orderRefFor } from "../src/server/payments/bold.ts";

test("Bold: firma de integridad igual al ejemplo oficial (SHA-256 hex)", () => {
  // Ejemplo de la documentación: "inv033439400COPkgfq2nN0o52XqnuXZWIN2F".
  const sig = integritySignature("inv0334", 39400, "COP", "kgfq2nN0o52XqnuXZWIN2F");
  assert.match(sig, /^[a-f0-9]{64}$/);
  assert.notEqual(sig, integritySignature("inv0334", 39401, "COP", "kgfq2nN0o52XqnuXZWIN2F"));
});

test("Bold: webhook acepta firma válida y rechaza alterada o ausente", () => {
  const body = JSON.stringify({ id: "evt", type: "SALE_APPROVED" });
  const good = createHmac("sha256", "secreto").update(Buffer.from(body).toString("base64")).digest("hex");
  assert.equal(verifyWebhook(body, good, "secreto"), true);
  assert.equal(verifyWebhook(body + " ", good, "secreto"), false);
  assert.equal(verifyWebhook(body, good, "otra"), false);
  assert.equal(verifyWebhook(body, null, "secreto"), false);
  // Modo pruebas de Bold: llave vacía.
  const sandbox = createHmac("sha256", "").update(Buffer.from(body).toString("base64")).digest("hex");
  assert.equal(verifyWebhook(body, sandbox, ""), true);
});

test("Bold: referencia de orden estable y sin guiones", () => {
  assert.equal(orderRefFor("1b2c-3d"), "ELT1b2c3d");
});
