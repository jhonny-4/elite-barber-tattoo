import type { Metadata } from "next";
import { QueueMonitor } from "../../components/queue/monitor";

export const metadata: Metadata = {
  title: "Pantalla de turnos",
  description:
    "Monitor público de turnos de Elite Barber & Tattoo: solo número, profesional y servicio.",
};

export default function Page() {
  return <QueueMonitor />;
}
