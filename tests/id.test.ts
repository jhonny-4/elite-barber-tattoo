import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoId } from "../src/domain/id.ts";
test("genera IDs únicos sin randomUUID para la vista HTTP del celular", () => {
  const descriptor = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  try {
    Object.defineProperty(crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });
    const a = createDemoId(),
      b = createDemoId();
    assert.match(
      a,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.notEqual(a, b);
  } finally {
    if (descriptor) Object.defineProperty(crypto, "randomUUID", descriptor);
    else Reflect.deleteProperty(crypto, "randomUUID");
  }
});
