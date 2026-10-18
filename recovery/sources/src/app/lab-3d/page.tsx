// Ruta temporal de pruebas del área sculpture. BORRAR antes de entregar.
// /lab-3d muestra todas las variantes; /lab-3d?only=elite-600 muestra solo una
// (un único contexto WebGL: más fps en Chromium headless).
import { EliteSculpture } from "../../components/elite-sculpture";
import { ArtistMonogram } from "../../components/artist-monogram";

export const metadata = { title: "Lab 3D" };

const frame = (maxWidth: number) => ({
  width: "100%",
  maxWidth,
  margin: "0 auto",
  outline: "1px dashed rgb(255 255 255 / 0.18)",
});

const variants = [
  { id: "elite-full", max: 1320, node: <EliteSculpture /> },
  { id: "elite-600", max: 600, node: <EliteSculpture /> },
  { id: "jc-420", max: 420, node: <ArtistMonogram /> },
  { id: "elite-360", max: 360, node: <EliteSculpture /> },
  { id: "jc-300", max: 300, node: <ArtistMonogram label={false} /> },
];

export default async function Lab3D({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { only, pad } = await searchParams;
  const list = only ? variants.filter((v) => v.id === only) : variants;
  return (
    <main
      style={{
        background: "#000",
        minHeight: "100vh",
        padding: `${typeof pad === "string" ? pad : "24"}px 16px 120vh`,
        display: "grid",
        alignContent: "start",
        gap: 48,
      }}
    >
      {list.map((v) => (
        <section key={v.id} data-lab={v.id} style={frame(v.max)}>
          {v.node}
        </section>
      ))}
    </main>
  );
}
