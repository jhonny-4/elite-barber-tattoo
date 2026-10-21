import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const source = path.resolve(process.argv[2] ?? "var/portfolio-import");
const output = path.resolve("public/media/tattoos/organizado");
await mkdir(output, { recursive: true });
const items = [];
const walk = async (dir) => {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
};
const all = await walk(source);
const groups = new Map();
for (const file of all
  .filter((f) => /\.(jpe?g|png|webp|mp4)$/i.test(f))
  .sort()) {
  const relative = path.relative(source, file).split(path.sep);
  if (relative.length < 4) continue;
  const group = relative[1];
  const slug = group.replace(/^\d+_/, "").toLowerCase().replace(/_/g, "-");
  const current = groups.get(slug) ?? {
    title: group.replace(/^\d+_/, "").replace(/_/g, " "),
    photos: [],
    videos: [],
    artist: relative[0].startsWith("05_"),
  };
  if (/\.mp4$/i.test(file)) {
    const name = `${slug}-${path.basename(file).toLowerCase()}`;
    await writeFile(path.join(output, name), await readFile(file));
    current.videos.push(`/media/tattoos/organizado/${name}`);
  } else {
    const name = `${slug}-${path.parse(file).name.toLowerCase()}.webp`;
    const info = await sharp(file)
      .rotate()
      .resize({ width: 1440, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(path.join(output, name));
    current.photos.push({
      id: `portfolio-${slug}-${current.photos.length}`,
      category: "tattoo",
      title: current.title,
      subtitle: "Jean Carlos · Tatuaje",
      source: `/media/tattoos/organizado/${name}`,
      original: `/media/tattoos/organizado/${name}`,
      sourceWidth: info.width,
      sourceHeight: info.height,
      crop: [0, 0, info.width, info.height],
      capture: true,
    });
  }
  groups.set(slug, current);
}
for (const [slug, group] of groups) {
  if (group.artist) continue;
  const [photo, ...rest] = group.photos;
  const first = photo ?? {
    id: `portfolio-${slug}`,
    category: "tattoo",
    title: group.title.replace(/ Solo Video$/, ""),
    subtitle: "Jean Carlos · Video",
    source: "/pwa/icons/elite-512.png",
    sourceWidth: 512,
    sourceHeight: 512,
    crop: [0, 0, 512, 512],
  };
  items.push({
    ...first,
    ...(rest.length ? { views: rest } : {}),
    ...(group.videos.length ? { videos: group.videos } : {}),
  });
}
await writeFile(
  "src/domain/portfolio-extra.json",
  JSON.stringify(items, null, 2) + "\n",
);
await writeFile(
  "public/media/tattoos/organizado/inventario.json",
  JSON.stringify(
    [...groups.values()].map(({ title, photos, videos, artist }) => ({
      title,
      photos: photos.map((p) => p.source),
      videos,
      artist,
    })),
    null,
    2,
  ) + "\n",
);
console.log(
  `${items.length} trabajos, ${[...groups.values()].reduce((n, g) => n + g.photos.length, 0)} fotos, ${[...groups.values()].reduce((n, g) => n + g.videos.length, 0)} videos. Artista separado del portafolio de tatuajes.`,
);
