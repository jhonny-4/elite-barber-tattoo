"use client";
import { Dashboard } from "../dashboard";
import { signOut } from "../../server/auth/actions";

/** Panel ya autorizado en el servidor; aquí solo se elige la vista según el rol. */
export function StaffPanel({ barberView }: { barberView: boolean }) {
  return <Dashboard professionalOnly={barberView} onExit={() => void signOut()} />;
}
