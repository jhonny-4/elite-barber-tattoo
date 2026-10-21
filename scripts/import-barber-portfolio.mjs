// Importación explícita y repetible. El ZIP y sus catálogos se tratan solo como datos.
import { createHash } from "node:crypto";
import { loadEnvFile } from "node:process";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";
import sharp from "sharp";

const mode = process.argv[2] ?? "prepare";
const root = path.resolve("var/barber-portfolio-import");
const output = path.resolve("var/portfolio-import/barberos");
const manifestFile = path.join(output, "manifest.json");
const digest = (data) => createHash("sha256").update(data).digest("hex");
const uuid = (text) => {
  const h = digest(text);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const ffmpeg = process.env.FFMPEG_PATH ?? path.resolve("var/qa-tools/node_modules/ffmpeg-static/ffmpeg.exe");
const ffprobe = process.env.FFPROBE_PATH ?? path.resolve("var/qa-tools/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe");
function run(exe, args) {
  const result = spawnSync(exe, args, { encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Error de conversión: ${result.error?.message ?? result.stderr.slice(-1500)}`);
  return result.stdout;
}
const safeInput = (relative) => {
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw new Error("Ruta fuera del ZIP extraído.");
  return file;
};

if (mode === "prepare") {
  await mkdir(output, { recursive: true });
  const plan = { assets: [], duplicates: [] };
  for (const person of [{ folder: "Nelson", slug: "nelson", name: "Nelson" }, { folder: "Iván", slug: "ivan", name: "Ivan" }]) {
    const catalog = JSON.parse(await readFile(safeInput(`${person.folder}/02_Inventario/Catalogo.json`), "utf8"));
    const seen = new Map();
    let order = 0;
    for (const section of catalog.secciones) {
      const title = section.id.replace(/^\d+_/, "").replaceAll("_", " ").replace("diseno", "diseño").replace("clasico", "clásico");
      for (const entry of section.archivos) {
        const input = safeInput(entry.ruta);
        const original = await readFile(input);
        const hash = digest(original);
        if (seen.has(hash)) { plan.duplicates.push({ file: entry.ruta, sameAs: seen.get(hash) }); continue; }
        seen.set(hash, entry.ruta);
        const id = uuid(`elite-barber-portfolio-v1:${person.slug}:${hash}`);
        const kind = entry.tipo;
        if (!["foto", "video"].includes(kind)) throw new Error("Tipo de archivo desconocido.");
        const filename = `${person.slug}-${id}.${kind === "foto" ? "webp" : "mp4"}`;
        let width, height, poster = null;
        if (kind === "foto") {
          const result = await sharp(original, { limitInputPixels: 60_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(output, filename));
          width = result.width; height = result.height;
        } else {
          const target = path.join(output, filename);
          run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-map", "0:v:0", "-map", "0:a?", "-vf", "scale=w='min(1080,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-map_metadata", "-1", target]);
          const info = JSON.parse(run(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name:format=duration", "-of", "json", target]));
          if (info.streams[0]?.codec_name !== "h264") throw new Error("Video sin H.264.");
          width = info.streams[0].width; height = info.streams[0].height;
          const frame = path.join(output, `${person.slug}-${id}-frame.png`);
          run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", target, "-frames:v", "1", frame]);
          poster = `${person.slug}-${id}-poster.webp`;
          await sharp(frame).resize({ width: 1080, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 83 }).toFile(path.join(output, poster));
          if ((await stat(target)).size > 80 * 1024 * 1024) throw new Error("Video mayor de 80 MB.");
        }
        plan.assets.push({ id, slug: person.slug, name: person.name, kind, title, alt: `${person.name} · ${String(entry.descripcion).replace(/\s+/g, " ")}`.slice(0, 200), source: entry.ruta, hash, filename, poster, width, height, order: order++ });
        console.log(`Preparado: ${person.name} · ${kind} · ${title}`);
      }
    }
  }
  await writeFile(manifestFile, JSON.stringify(plan, null, 2) + "\n");
  const thumbs = await Promise.all(plan.assets.map(async (a) => ({ input: await sharp(path.join(output, a.poster ?? a.filename)).resize(180, 220, { fit: "contain", background: "#151515" }).jpeg().toBuffer() })));
  const columns = 6;
  await sharp({ create: { width: columns * 180, height: Math.ceil(thumbs.length / columns) * 220, channels: 3, background: "#151515" } }).composite(thumbs.map((t, i) => ({ ...t, left: (i % columns) * 180, top: Math.floor(i / columns) * 220 }))).jpeg().toFile(path.join(output, "contact-sheet.jpg"));
  console.log(JSON.stringify({ assets: plan.assets.length, duplicates: plan.duplicates }));
} else if (mode === "publish" || mode === "verify") {
  loadEnvFile(".env.hostinger");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: barbers, error } = await db.from("barbers").select("id,slug,display_name");
  if (error) throw new Error("No se pudo leer el equipo de producción.");
  const plan = JSON.parse(await readFile(manifestFile, "utf8"));
  const aws = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  const objectUrl = (key) => `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
  async function storePhoto(file, key) {
    const { error: uploadError } = await db.storage.from("galeria").upload(key, await readFile(path.join(output, file)), { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw new Error("No se pudo subir la imagen: " + uploadError.message);
  }
  for (const asset of plan.assets) {
    const barber = barbers.find((b) => b.slug === asset.slug);
    if (!barber || barber.display_name !== asset.name) throw new Error("No coincide la identidad del barbero.");
    const storagePath = asset.kind === "foto" ? `barberos/${barber.id}/portfolio-${asset.id}.webp` : `r2:videos/${barber.id}/${asset.id}.mp4`;
    const posterPath = asset.poster ? `barberos/${barber.id}/portfolio-${asset.id}-poster.webp` : null;
    const { data: existing, error: lookupError } = await db.from("media").select("id,published,barber_id,storage_path").eq("id", asset.id).maybeSingle();
    if (lookupError) throw new Error("No se pudo comprobar la publicación.");
    if (existing && (existing.barber_id !== barber.id || existing.storage_path !== storagePath || !existing.published)) throw new Error("Publicación existente incompatible; no se sobrescribe.");
    if (mode === "publish" && !existing) {
      if (asset.kind === "foto") await storePhoto(asset.filename, storagePath);
      else {
        const key = storagePath.slice(3);
        const head = await aws.fetch(objectUrl(key), { method: "HEAD", signal: AbortSignal.timeout(30_000) });
        const bytes = await readFile(path.join(output, asset.filename));
        if (head.status === 404) {
          const uploaded = await aws.fetch(objectUrl(key), { method: "PUT", headers: { "Content-Type": "video/mp4", "If-None-Match": "*" }, body: bytes, signal: AbortSignal.timeout(120_000) });
          if (!uploaded.ok) throw new Error(`R2 no aceptó el video (${uploaded.status}).`);
        } else if (!head.ok || Number(head.headers.get("content-length")) !== bytes.length) throw new Error("Objeto R2 existente incompatible.");
        await storePhoto(asset.poster, posterPath);
      }
      const { error: insertError } = await db.from("media").insert({ id: asset.id, section: "barbero", barber_id: barber.id, kind: asset.kind, storage_path: storagePath, poster_path: posterPath, title: asset.title, alt: asset.alt, width: asset.width, height: asset.height, published: true, sort_order: asset.order });
      if (insertError) throw new Error("No se pudo registrar la publicación: " + insertError.message);
    } else if (!existing) throw new Error("Falta una publicación.");
    const { data: row, error: checkError } = await db.from("media").select("published,barber_id,storage_path,poster_path").eq("id", asset.id).single();
    if (checkError || !row.published || row.barber_id !== barber.id || row.storage_path !== storagePath || row.poster_path !== posterPath) throw new Error("La publicación no coincide con el plan.");
    const publicPhoto = db.storage.from("galeria").getPublicUrl(asset.kind === "foto" ? storagePath : posterPath).data.publicUrl;
    const imageCheck = await fetch(publicPhoto, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
    if (!imageCheck.ok) throw new Error(`Imagen pública no disponible (${imageCheck.status}).`);
    if (asset.kind === "video") {
      const videoCheck = await aws.fetch(objectUrl(storagePath.slice(3)), { method: "HEAD", signal: AbortSignal.timeout(20_000) });
      if (!videoCheck.ok || Number(videoCheck.headers.get("content-length")) !== (await stat(path.join(output, asset.filename))).size) throw new Error("Video no disponible o tamaño incorrecto.");
    }
    console.log(`Verificado: ${asset.name} · ${asset.kind} · ${asset.title}`);
  }
  console.log(`Publicaciones verificadas: ${plan.assets.length}`);
} else throw new Error("Usa prepare, publish o verify.");
