"use client";
import { LivePanel } from "../admin/live-panel";

/** Panel ya autorizado en el servidor; aquí solo se elige la vista según el rol. */
export function StaffPanel({ barberView }: { barberView: boolean }) {
  void barberView;
  return <LivePanel />;
}
