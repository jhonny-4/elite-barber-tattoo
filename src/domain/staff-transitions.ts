export const bookingTransitions: Record<string, string[]> = {
  confirmada: ["en_atencion", "cancelada", "no_asistio"],
  en_atencion: ["finalizada"],
};
export const queueTransitions: Record<string, string[]> = {
  esperando: ["llamado", "cancelado"],
  llamado: ["en_atencion", "cancelado"],
  en_atencion: ["finalizado"],
};
export const tattooTransitions: Record<string, string[]> = {
  pendiente: ["en_evaluacion", "cerrada"],
  en_evaluacion: ["cotizada", "cerrada"],
  cotizada: ["fecha_acordada", "cerrada"],
  fecha_acordada: ["cerrada"],
};
