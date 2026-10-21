import "server-only";
import { getStaff, type Staff } from "../auth/staff";
import { BookingError } from "../bookings";
import { adminClient } from "../supabase/clients";

export async function requireStaffApi(owner = false): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) throw new BookingError("Inicia sesión.", 401);
  if (owner && staff.role !== "dueno") throw new BookingError("Acceso restringido.", 403);
  return staff;
}

export async function audit(staff: Staff, action: string, entity: string, entityId: string, data?: Record<string, string | number | boolean | null>) {
  const { error } = await adminClient().from("audit_log").insert({ actor: staff.userId, action, entity, entity_id: entityId, data });
  if (error) console.error("No se pudo registrar auditoría del panel", error.code);
}
