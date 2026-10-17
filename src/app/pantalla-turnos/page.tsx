import type { Metadata } from "next";
import { QueueMonitor } from "../../components/queue/monitor";
export const metadata: Metadata = {
  title: "Pantalla pública de turnos · Elite",
};
export default function Page() {
  return <QueueMonitor />;
}
