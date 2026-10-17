export type QueueStatus =
  "esperando" | "llamado" | "en-atencion" | "finalizado" | "cancelado";
export type QueueTicket = {
  id: string;
  token: string;
  number: string;
  date: string;
  name: string;
  phone: string;
  serviceId: string;
  barberId: string;
  source: "qr" | "presencial";
  status: QueueStatus;
  createdAt: string;
  assignedBarberId?: string;
  reservedStart?: string;
  finishedAt?: string;
};
export const activeTicket = (ticket: QueueTicket) =>
  ["esperando", "llamado", "en-atencion"].includes(ticket.status);
