import assert from "node:assert/strict";
import test from "node:test";
import { PHOTO_MAX_BYTES, VIDEO_MAX_BYTES, buildVideoKey, checkAlt, checkTitle, checkVideoDeclared, moveId, parseVideoKey, publicVideoPath, r2Prefix, sniffVideo } from "../src/domain/gallery.ts";

const B = "11111111-1111-4111-8111-111111111111";
const U = "22222222-2222-4222-8222-222222222222";

test("claves de video: prefijo por entorno y ida y vuelta", () => {
  assert.equal(r2Prefix("production"), "");
  assert.equal(r2Prefix("development"), "dev/");
  assert.equal(r2Prefix(undefined), "dev/");
  const key = buildVideoKey("dev/", B, U, "mp4");
  assert.equal(key, `dev/videos/${B}/${U}.mp4`);
  assert.deepEqual(parseVideoKey(key, "dev/"), { barberId: B, uuid: U, ext: "mp4" });
  assert.equal(publicVideoPath(key, "dev/"), `videos/${B}/${U}.mp4`);
});

test("claves inválidas o de otro entorno se rechazan", () => {
  assert.equal(parseVideoKey(`videos/${B}/${U}.mp4`, "dev/"), null, "sin prefijo dev/ en desarrollo");
  assert.equal(parseVideoKey(`dev/videos/${B}/${U}.mp4`, ""), null, "con dev/ en producción");
  assert.equal(parseVideoKey(`dev/videos/${B}/../${U}.mp4`, "dev/"), null);
  assert.equal(parseVideoKey(`dev/videos/${B}/${U}.exe`, "dev/"), null);
  assert.equal(parseVideoKey(`dev/videos/otro/${U}.mp4`, "dev/"), null);
  assert.equal(parseVideoKey(`dev/videos/${B}/${U}.mp4/x`, "dev/"), null);
});

test("video declarado: tipo y tamaño", () => {
  assert.equal(checkVideoDeclared("video/mp4", 1000), null);
  assert.equal(checkVideoDeclared("video/webm", VIDEO_MAX_BYTES), null);
  assert.ok(checkVideoDeclared("video/mp4", VIDEO_MAX_BYTES + 1));
  assert.ok(checkVideoDeclared("video/quicktime", 1000));
  assert.ok(checkVideoDeclared("video/mp4", 0));
  assert.ok(checkVideoDeclared("video/mp4", 1.5));
  assert.ok(checkVideoDeclared("video/mp4", "10"));
  assert.ok(PHOTO_MAX_BYTES < VIDEO_MAX_BYTES);
});

test("firma de contenedor por bytes", () => {
  const mp4 = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
  assert.equal(sniffVideo(mp4), "mp4");
  assert.equal(sniffVideo(webm), "webm");
  assert.equal(sniffVideo(new Uint8Array([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0])), null);
  assert.equal(sniffVideo(new Uint8Array([])), null);
});

test("alt obligatorio de 3 a 200 y título hasta 80", () => {
  assert.ok(checkAlt(undefined));
  assert.ok(checkAlt("  a "));
  assert.equal(checkAlt("Fade"), null);
  assert.equal(checkAlt("x".repeat(200)), null);
  assert.ok(checkAlt("x".repeat(201)));
  assert.equal(checkTitle(undefined), null);
  assert.equal(checkTitle(""), null);
  assert.ok(checkTitle("x".repeat(81)));
});

test("reordenar mueve una posición y respeta los bordes", () => {
  assert.deepEqual(moveId(["a", "b", "c"], "b", "up"), ["b", "a", "c"]);
  assert.deepEqual(moveId(["a", "b", "c"], "b", "down"), ["a", "c", "b"]);
  assert.deepEqual(moveId(["a", "b", "c"], "a", "up"), ["a", "b", "c"]);
  assert.deepEqual(moveId(["a", "b", "c"], "z", "down"), ["a", "b", "c"]);
});
