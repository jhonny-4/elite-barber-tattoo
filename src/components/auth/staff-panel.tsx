"use client";
import { Dashboard } from "../dashboard";
import { signOut } from "../../server/auth/actions";

/** Panel ya autorizado en el servidor; aquí solo se elige la vista según el rol. */
export function StaffPanel({ barberView, barberSlug }: { barberView: boolean; barberSlug?: string | null }) {
  return <Dashboard professionalOnly={barberView} barberSlug={barberSlug} onExit={() => void signOut()} />;
}
