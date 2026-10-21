import { test } from "node:test";
import assert from "node:assert/strict";
import { validateContact } from "../src/domain/contact.ts";

// Regresión: el formulario rechazaba celulares escritos sin +57 (3012345678).
test("contacto: acepta celular colombiano con y sin +57, rechaza cortos", () => {
  const ok = (phone: string) => !validateContact({ name: "Cliente", phone, email: "c@ejemplo.co" }).phone;
  for (const p of ["3012345678", "301 234 5678", "+573012345678", "573012345678", "+57 301 234 5678"]) assert.equal(ok(p), true, p);
  for (const p of ["301234567", "12345", "+5730123456789"]) assert.equal(ok(p), false, p);
});
