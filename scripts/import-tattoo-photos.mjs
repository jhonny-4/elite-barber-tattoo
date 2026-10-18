import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import sharp from "sharp";

// Names such as anubis-01.jpg / anubis-02.jpg form one work with several angles.
const root = process.cwd();
const folder = resolve(process.argv[2] || join(root, "public/media/tattoos/nuevos"));
const output = join(root, "public/media/tattoos/portfolio");
let manifest = {};
try {
  manifest = JSON.parse(await readFile(join(folder, "manifest.json"), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(output, { recursive: true });
const files = (await readdir(folder)).filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name)).sort();
if (!files.length) {
  console.error("No hay fotos para importar. No se modificó el portafolio.");
  process.exitCode = 1;
} else {
  const groups = new Map();
  for (const [index, file] of files.entries()) {
    const slug = file.replace(/\.[^.]+$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const group = slug.replace(/-\d+$/, "");
    const meta = manifest[group] ?? {};
    const image = sharp(join(folder, file)).rotate().resize({ width: 1440, withoutEnlargement: true });
    const info = await image.webp({ quality: 88 }).toFile(join(output, `${slug}.webp`));
    const item = {
      id: `tattoo-${group}-${index}`, category: "tattoo",
      title: meta.title ?? group.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
      subtitle: "Jean Carlos · Tatuaje", source: `/media/tattoos/portfolio/${slug}.webp`,
      original: `/media/tattoos/portfolio/${slug}.webp`, capture: true,
      sourceWidth: info.width, sourceHeight: info.height, crop: [0, 0, info.width, info.height],
    };
    // A viewport removes screenshot controls without editing the photograph.
    const crop = meta.crops?.[slug];
    if (crop) {
      if (crop.length !== 4 || !crop.every(Number.isFinite) || crop[0] < 0 || crop[1] < 0 || crop[2] <= 0 || crop[3] <= 0 || crop[0] + crop[2] > info.width || crop[1] + crop[3] > info.height)
        throw new Error(`Encuadre inválido: ${slug}`);
      item.crop = crop;
      delete item.original;
    }
    const current = groups.get(group);
    if (current) (current.views ??= []).push(item);
    else groups.set(group, item);
  }
  await writeFile(join(root, "src/domain/portfolio-extra.json"), JSON.stringify([...groups.values()], null, 2) + "\n");
  console.log(`${files.length} fotos importadas en ${groups.size} trabajos. Se conserva el encuadre completo, sin inventar detalle.`);
}
