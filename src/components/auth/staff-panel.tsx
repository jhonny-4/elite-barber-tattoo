"use client";
import { Dashboard } from "../dashboard";
import { PanelAlerts } from "../admin/panel-alerts";
import { PushToggle } from "../admin/push-toggle";
import { signOut } from "../../server/auth/actions";

/** Panel ya autorizado en el servidor; aquí solo se elige la vista según el rol. */
export function StaffPanel({ barberView, barberSlug }: { barberView: boolean; barberSlug?: string | null }) {
  return (
    <>
      <div className="panel-alert-row">
        <PanelAlerts />
        <PushToggle />
        {!barberView && <a className="button button-outline button-small" href="/administracion/resenas">★ Reseñas</a>}
      </div>
      <Dashboard professionalOnly={barberView} barberSlug={barberSlug} onExit={() => void signOut()} />
    </>
  );
}
