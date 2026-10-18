import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elite Barber & Tattoo",
    short_name: "Elite",
    description: "Reservas, turnos y tatuajes de Elite Barber & Tattoo, Cartagena.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es-CO",
    icons: [
      {
        src: "/pwa/icons/elite-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icons/elite-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icons/elite-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Reservar", url: "/reservar" },
      { name: "Tomar turno", url: "/turnos" },
    ],
  };
}
