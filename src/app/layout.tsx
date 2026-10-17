import type { Metadata, Viewport } from "next";
import { PwaManager } from "../components/pwa/manager";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./globals.css";
import "./monochrome.css";
import "./brand-experience.css";
import "./refinement.css";
import "./v4.css";
export const metadata: Metadata = {
  applicationName: "Elite Demo",
  appleWebApp: {
    capable: true,
    title: "Elite Demo",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/pwa/icons/elite-192.png",
    apple: "/pwa/icons/elite-192.png",
  },
  title: "Elite Barber & Tattoo | Prototipo ZENKO",
  description:
    "Demostración de barbería y portafolio de Jean Carlos en Cartagena.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
