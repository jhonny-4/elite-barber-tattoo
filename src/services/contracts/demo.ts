import type { DemoState, Booking, TattooRequest } from "../../domain/demo.ts";
import type { QueueTicket } from "../../domain/queue/model.ts";
import type { TeamMember } from "../../domain/team/model.ts";
import type { DemoNotification } from "../../domain/notifications/model.ts";
export type SharedState = DemoState & {
  schema: 4;
  revision: number;
  /**
   * Identificador aleatorio del almacén vigente: cambia con un reset o si el
   * almacén se reemplaza (p. ej. un despliegue nuevo en Netlify). Permite al
   * cliente aceptar una revisión menor que pertenece a otro almacén.
   */
  epoch?: string;
  team: TeamMember[];
  queue: QueueTicket[];
  notifications: DemoNotification[];
  receipts: { key: string; resultId?: string }[];
};
export type DemoCommand =
  | { type: "booking.create"; input: Omit<Booking, "id" | "status" | "token"> }
  | {
      type: "booking.change";
      id: string;
      action: "cancel" | "start" | "finish" | "reschedule" | "checkin" | "call";
      date?: string;
      time?: string;
      barberId?: string;
    }
  | { type: "tattoo.create"; input: Omit<TattooRequest, "id" | "status"> }
  | { type: "tattoo.change"; id: string; status: TattooRequest["status"] }
  | { type: "team.save"; member: TeamMember }
  | {
      type: "queue.join";
      input: Pick<
        QueueTicket,
        "name" | "phone" | "serviceId" | "barberId" | "source"
      >;
    }
  | {
      type: "queue.change";
      id: string;
      action: "call" | "start" | "finish" | "cancel";
      barberId?: string;
    }
  | { type: "notifications.read" }
  | { type: "reset" };
export type CommandResult = { state: SharedState; resultId?: string };
export type PublicTicket = {
  number: string;
  status: QueueTicket["status"];
  barber: string;
  service: string;
  position: number | null;
  estimatedMinutes: number | null;
};
export type PublicQueue = {
  date: string;
  revision: number;
  waiting: number;
  called: PublicTicket[];
  serving: PublicTicket[];
  next: PublicTicket[];
  connection: "demo";
};
export interface DemoService {
  read(): Promise<SharedState>;
  execute(command: DemoCommand, key: string): Promise<CommandResult>;
}
