import type { Metadata, Viewport } from "next";
import { PwaManager } from "../components/pwa/manager";
import { BackToTop } from "../components/back-to-top";
import { PageCurtain } from "../components/motion/page-curtain";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "../styles/index.css";

// URL pública para metadatos absolutos (vista previa al compartir). Netlify define
// URL (producción) y DEPLOY_PRIME_URL (despliegues de vista previa) durante el build.
// Dominio público: WhatsApp, Instagram y Facebook necesitan URLs absolutas para la vista previa.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://elite-barber-tatto.com"
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Elite Barber & Tattoo",
  appleWebApp: {
    capable: true,
    title: "Elite",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/pwa/icons/elite-192.png",
    apple: "/pwa/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Elite Barber & Tattoo",
    title: "Elite Barber & Tattoo · Barbería y tatuaje en Cartagena",
    description:
      "Barbería y tatuaje en un mismo lugar en Los Ejecutivos, Cartagena.",
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "Elite Barber & Tattoo · Barbería y tatuaje en Cartagena",
    template: "%s · Elite Barber & Tattoo",
  },
  description:
    "Barbería y tatuaje en un mismo lugar en Los Ejecutivos, Cartagena. Reserva tu corte o solicita la valoración de tu tatuaje con Jean Carlos.",
  // Sin indexar hasta el lanzamiento con dominio y datos confirmados (docs/PRODUCCION.md).
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: el script de abajo marca <html> antes de hidratar.
    <html lang="es-CO" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Antes de pintar: si la intro ya se vio en esta pestaña (o hay movimiento
            reducido), se oculta desde el primer fotograma. Texto fijo, sin datos. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('elite:intro:v4')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-intro-seen','')}catch(e){}",
          }}
        />
      </head>
      <body>
        {children}
        <PwaManager />
        <BackToTop />
        <PageCurtain />
      </body>
    </html>
  );
}
