import assert from "node:assert/strict";
import test from "node:test";
import { publishedPortfolio, type PublishedWork } from "../src/domain/published-portfolio.ts";

test("galería: conserva autor, foto completa y reproducción de video publicado", () => {
  const photo: PublishedWork = { id: "foto", kind: "foto", title: "Corte", alt: "Trabajo de Ivan", width: 720, height: 1280, url: "/foto.webp", posterUrl: null, barberName: "Ivan" };
  const video: PublishedWork = { ...photo, id: "video", kind: "video", title: null, barberName: "Nelson", url: "/api/media/video/clip.mp4", posterUrl: "/poster.webp" };
  const items = publishedPortfolio([photo, video]);
  assert.equal(items[0].subtitle, "Ivan · Barbería");
  assert.deepEqual(items[0].crop, [0, 0, 720, 1280]);
  assert.equal(items[1].subtitle, "Nelson · Video");
  assert.equal(items[1].original, "/poster.webp");
  assert.deepEqual(items[1].videos, [video.url]);
  assert.deepEqual(publishedPortfolio([{ ...video, posterUrl: null }]), []);
});
