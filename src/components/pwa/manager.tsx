"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function PwaManager() {
  const [offline, setOffline] = useState(false),
    [prepared, setPrepared] = useState(false),
    [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [secure, setSecure] = useState(true),
    [help, setHelp] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    setSecure(window.isSecureContext);
    setOffline(!navigator.onLine);
    const online = () => setOffline(false),
      offline = () => setOffline(true),
      install = (event: Event) => {
        event.preventDefault();
        setPrompt(event as InstallEvent);
      };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("beforeinstallprompt", install);
    let registration: ServiceWorkerRegistration | undefined,
      alive = true;
    const watch = () => {
      if (registration?.waiting) setWaiting(registration.waiting);
    };
    if (
      "serviceWorker" in navigator &&
      window.isSecureContext &&
      process.env.NODE_ENV === "production"
    )
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (!alive) return;
          registration = reg;
          void navigator.serviceWorker.ready.then(() => {
            if (alive) setPrepared(true);
          });
          watch();
          reg.addEventListener("updatefound", () => {
            reg.installing?.addEventListener("statechange", watch);
          });
          void reg.update();
        })
        .catch(() =>
          setMessage(
            "La instalación no pudo prepararse. La web sigue disponible en línea.",
          ),
        );
    return () => {
      alive = false;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);
  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setPrompt(null);
    } else setHelp(!help);
  }
  return (
    <>
      <div className="pwa-tools">
        <button className="text-link" onClick={() => void install()}>
          {prompt ? "Instalar Elite" : "Instalación de la app"}
        </button>
        {waiting && (
          <button
            className="button button-small"
            onClick={() => {
              setMessage("Actualizando…");
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => window.location.reload(),
                { once: true },
              );
              waiting.postMessage({ type: "ACTIVATE_UPDATE" });
            }}
          >
            Actualizar app
          </button>
        )}
      </div>
      {offline && (
        <div className="connection-banner" role="alert">
          Sin conexión. No se pueden confirmar reservas, turnos ni cambios.
        </div>
      )}
      {help && (
        <section className="pwa-help v4-card">
          <h3>Elite en tu pantalla de inicio</h3>
          <p>
            {secure
              ? "Android: menú del navegador → Instalar app. iPhone: Safari → Compartir → Añadir a pantalla de inicio."
              : "Esta IP usa HTTP. Puedes ver la demo, pero la instalación requiere localhost en el computador o un dominio HTTPS autorizado."}
          </p>
          <p>
            No hay envíos ni reservas de producción. La instalación no sustituye
            la conexión con el servidor local.
          </p>
          <p role="status">
            {prepared
              ? "Pantalla offline preparada por el service worker."
              : "Preparación offline pendiente o no disponible en este contexto."}
          </p>
          <button className="text-link" onClick={() => setHelp(false)}>
            Cerrar
          </button>
        </section>
      )}
      {message && (
        <p className="connection-banner" role="status">
          {message}
        </p>
      )}
    </>
  );
}
