// JavaScript (no TypeScript): Hostinger no puede cargar el SWC nativo para transpilar la configuración.
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import { networkInterfaces } from "node:os";

/** IPv4 de la red local: solo para abrir `next dev` desde un celular del mismo Wi-Fi. */
function localAddresses() {
  try {
    return Object.values(networkInterfaces()).flatMap((entries) =>
      (entries ?? [])
        .filter((entry) => entry.family === "IPv4" && !entry.internal)
        .map((entry) => entry.address),
    );
  } catch {
    // Algunos entornos aislados no permiten listar interfaces de red.
    return [];
  }
}

/**
 * Cabeceras básicas para lo que responde Next.js (páginas y API). En Netlify
 * esas respuestas salen de la función de Next.js; los archivos estáticos
 * (public/ y _next/static) los sirve la CDN con las cabeceras de netlify.toml.
 * No bloquean el iframe de Google Maps ni los enlaces a WhatsApp/Instagram.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

/** @param {string} phase @returns {import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    poweredByHeader: false,
    // Hostinger despliega el servidor autónomo que genera Next (.next/standalone).
    output: "standalone",
    serverExternalPackages: ["@netlify/blobs"],
    // allowedDevOrigins solo lo usa `next dev`; el build y Netlify no lo necesitan.
    ...(phase === PHASE_DEVELOPMENT_SERVER
      ? { allowedDevOrigins: ["localhost", "127.0.0.1", ...localAddresses()] }
      : {}),
    async headers() {
      return [
        { source: "/:path*", headers: securityHeaders },
        {
          source: "/sw.js",
          headers: [
            { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
            { key: "Content-Type", value: "application/javascript; charset=utf-8" },
            { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          ],
        },
      ];
    },
  };
}
