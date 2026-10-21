"use client";
import { useEffect, useState } from "react";
import { Icon } from "../icons";

type State = "checking" | "unsupported" | "off" | "on" | "busy";

/** La clave VAPID llega en base64url; PushManager la necesita en bytes. */
function keyBytes(base64url: string) {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const supported = () =>
  typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function registration() {
  // En producción PwaManager ya registró /sw.js; si no (p. ej. en desarrollo), se registra aquí.
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
}

async function send(method: "POST" | "DELETE", body: unknown) {
  const response = await fetch("/api/push", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "No se pudo actualizar los avisos.");
  }
}

/**
 * Avisos push del equipo: llegan aunque el panel esté cerrado (nuevas reservas, turnos y tatuajes).
 * Cada dispositivo se activa por separado; en iPhone requiere la app instalada en la pantalla de inicio.
 */
export function PushToggle() {
  const [state, setState] = useState<State>("checking");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    if (!supported()) {
      setState("unsupported");
      return;
    }
    void navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription() ?? null)
      .then((sub) => alive && setState(sub ? "on" : "off"))
      .catch(() => alive && setState("off"));
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setState("busy");
    setNote("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permiso de notificaciones bloqueado. Actívalo en la configuración del navegador.");
      const keyResponse = await fetch("/api/push", { cache: "no-store" });
      const { publicKey } = (await keyResponse.json().catch(() => ({}))) as { publicKey?: string };
      if (!keyResponse.ok || !publicKey) throw new Error("Los avisos push aún no están configurados en el servidor.");
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      await send("POST", sub.toJSON());
      setState("on");
      setNote("Listo: este dispositivo recibirá avisos aunque el panel esté cerrado.");
    } catch (e) {
      setState("off");
      setNote(e instanceof Error ? e.message : "No se pudieron activar los avisos.");
    }
  }

  async function disable() {
    setState("busy");
    setNote("");
    try {
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      if (sub) {
        await send("DELETE", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      setState("on");
      setNote(e instanceof Error ? e.message : "No se pudieron desactivar los avisos.");
    }
  }

  if (state === "unsupported")
    return (
      <p className="adm-hint" role="status">
        Este navegador no admite avisos push. En iPhone, instala la app en la pantalla de inicio y ábrela desde allí.
      </p>
    );

  const on = state === "on";
  return (
    <div className="panel-alerts">
      <button
        type="button"
        className={`button ${on ? "button-accent" : "button-outline"}`}
        aria-pressed={on}
        aria-busy={state === "busy" || state === "checking"}
        disabled={state === "busy" || state === "checking"}
        onClick={() => void (on ? disable() : enable())}
      >
        <Icon name="bell" /> {state === "busy" ? "Un momento…" : on ? "Avisos activos en este dispositivo" : "Recibir avisos en este dispositivo"}
      </button>
      {note && (
        <p className="adm-hint" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
