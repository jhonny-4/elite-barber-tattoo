import "server-only";
import { AwsClient } from "aws4fetch";
import { BookingError } from "../bookings";
import { r2Prefix } from "../../domain/gallery";

/** Prefijo del entorno: el bucket es compartido con producción, así que en desarrollo todo va bajo `dev/`. */
export const R2_PREFIX = r2Prefix(process.env.NODE_ENV);

function config() {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: id, R2_SECRET_ACCESS_KEY: secret, R2_BUCKET: bucket } = process.env;
  if (!account || !id || !secret || !bucket) throw new BookingError("Los videos no están configurados en este entorno.", 503);
  return { account, id, secret, bucket };
}

export const r2Configured = () => Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

function target(key: string) {
  const { account, id, secret, bucket } = config();
  const client = new AwsClient({ accessKeyId: id, secretAccessKey: secret, service: "s3", region: "auto" });
  // La clave se codifica por segmento: conserva las «/» como separadores.
  const url = `https://${account}.r2.cloudflarestorage.com/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return { client, url };
}

/** URL de subida directa desde el navegador; el Content-Type queda firmado. Caduca en `seconds`. */
export async function presignPut(key: string, contentType: string, seconds = 600) {
  const { client, url } = target(key);
  const signedUrl = new URL(url);
  signedUrl.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await client.sign(signedUrl.toString(), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    aws: { signQuery: true },
  });
  return signed.url;
}

/** Lee un objeto (o un rango) y devuelve la respuesta de R2 sin exponer credenciales ni URLs firmadas. */
export async function getObject(key: string, range?: string | null) {
  const { client, url } = target(key);
  return client.fetch(url, { method: "GET", headers: range ? { Range: range } : {}, signal: AbortSignal.timeout(30_000) });
}

/** Metadatos del objeto, o null si no existe. */
export async function headObject(key: string) {
  const { client, url } = target(key);
  const response = await client.fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 HEAD respondió ${response.status}.`);
  return {
    size: Number(response.headers.get("content-length") ?? 0),
    contentType: response.headers.get("content-type") ?? "",
  };
}

/** Borra un objeto; R2 responde 204 también si no existía. */
export async function deleteObject(key: string) {
  const { client, url } = target(key);
  const response = await client.fetch(url, { method: "DELETE", signal: AbortSignal.timeout(15_000) });
  if (!response.ok && response.status !== 404) throw new Error(`R2 DELETE respondió ${response.status}.`);
}

/** Lista objetos bajo un prefijo (ListObjectsV2, hasta 1000). */
export async function listObjects(prefix: string) {
  const { account, id, secret, bucket } = config();
  const client = new AwsClient({ accessKeyId: id, secretAccessKey: secret, service: "s3", region: "auto" });
  const response = await client.fetch(`https://${account}.r2.cloudflarestorage.com/${bucket}?list-type=2&max-keys=1000&prefix=${encodeURIComponent(prefix)}`);
  if (!response.ok) throw new Error(`R2 respondió ${response.status} al listar.`);
  const xml = await response.text();
  return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(([, c]) => ({
    key: c.match(/<Key>([^<]+)<\/Key>/)?.[1] ?? "",
    size: Number(c.match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0),
    modified: Date.parse(c.match(/<LastModified>([^<]+)<\/LastModified>/)?.[1] ?? ""),
  })).filter((o) => o.key);
}
