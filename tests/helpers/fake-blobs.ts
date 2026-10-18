import type {
  BlobsConsistency,
  BlobsStoreLike,
} from "../../src/server/demo/store/blobs-backend.ts";

/** PNG real de 1×1 px (70 bytes) para referencias de prueba. */
export const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
export const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;

type Entry = {
  data: string | ArrayBuffer;
  etag: string;
  metadata?: Record<string, unknown>;
};

/**
 * Almacén falso en memoria que imita a `Store` de @netlify/blobs:
 * getWithMetadata con ETag, setJSON condicional (onlyIfMatch / onlyIfNew),
 * get/set binarios, delete y deleteAll. `beforeSet` permite simular que otra
 * instancia escribe entre la lectura y la escritura condicional.
 */
export class FakeBlobStore implements BlobsStoreLike {
  entries = new Map<string, Entry>();
  reads: { key: string; consistency?: BlobsConsistency }[] = [];
  writes: { key: string; condition: string; modified: boolean }[] = [];
  beforeSet: ((key: string) => void | Promise<void>) | null = null;
  failWith: Error | null = null;
  strongUnavailable = false;
  private counter = 0;

  private nextEtag() {
    this.counter += 1;
    return `"etag-${this.counter}"`;
  }
  private check(consistency?: BlobsConsistency) {
    if (this.failWith) throw this.failWith;
    if (this.strongUnavailable && consistency === "strong") {
      const error = new Error("strong consistency unavailable");
      error.name = "BlobsConsistencyError";
      throw error;
    }
  }
  async getWithMetadata(
    key: string,
    options: { type: "text"; consistency?: BlobsConsistency },
  ) {
    this.check(options.consistency);
    this.reads.push({ key, consistency: options.consistency });
    const entry = this.entries.get(key);
    if (!entry) return null;
    const data =
      typeof entry.data === "string"
        ? entry.data
        : new TextDecoder().decode(entry.data);
    return { data, etag: entry.etag };
  }
  async setJSON(
    key: string,
    data: unknown,
    options: { onlyIfMatch: string } | { onlyIfNew: true },
  ) {
    this.check();
    if (this.beforeSet) await this.beforeSet(key);
    const current = this.entries.get(key);
    const condition =
      "onlyIfMatch" in options ? `match:${options.onlyIfMatch}` : "new";
    const allowed =
      "onlyIfMatch" in options
        ? current?.etag === options.onlyIfMatch
        : current === undefined;
    this.writes.push({ key, condition, modified: allowed });
    if (!allowed) return { modified: false };
    const etag = this.nextEtag();
    this.entries.set(key, { data: JSON.stringify(data), etag });
    return { modified: true, etag };
  }
  async get(
    key: string,
    options: { type: "arrayBuffer"; consistency?: BlobsConsistency },
  ) {
    this.check(options.consistency);
    const entry = this.entries.get(key);
    if (!entry) return null;
    return typeof entry.data === "string"
      ? new TextEncoder().encode(entry.data).buffer
      : entry.data.slice(0);
  }
  async set(
    key: string,
    data: ArrayBuffer,
    options?: { metadata?: Record<string, unknown> },
  ) {
    this.check();
    const etag = this.nextEtag();
    this.entries.set(key, {
      data: data.slice(0),
      etag,
      metadata: options?.metadata,
    });
    return { modified: true, etag };
  }
  async delete(key: string) {
    this.check();
    this.entries.delete(key);
  }
  async deleteAll() {
    this.check();
    const deletedBlobs = this.entries.size;
    this.entries.clear();
    return { deletedBlobs };
  }
  /** Simula otra instancia que guarda un valor sin pasar por este backend. */
  forceJSON(key: string, data: unknown) {
    this.entries.set(key, { data: JSON.stringify(data), etag: this.nextEtag() });
  }
}
