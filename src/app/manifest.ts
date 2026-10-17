import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elite Barber & Tattoo · Demo",
    short_name: "Elite Demo",
    description: "Agenda y turnos de demostración de Elite, Cartagena.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
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
        src: "/pwa/icons/elite-512.png",
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
