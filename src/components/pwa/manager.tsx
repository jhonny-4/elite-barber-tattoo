"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
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
  const trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLElement>(null);
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
  // Ayuda de instalación: foco al abrir, Escape para cerrar y foco de vuelta al botón.
  useEffect(() => {
    if (!help) return;
    panel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHelp(false);
      trigger.current?.focus();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [help]);
  function closeHelp() {
    setHelp(false);
    trigger.current?.focus();
  }
  async function install() {
    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        setPrompt(null);
        if (choice.outcome === "accepted") setMessage("Elite se está añadiendo a tu dispositivo.");
      } catch {
        setPrompt(null);
        setHelp(true);
      }
    } else setHelp(!help);
  }
  useEffect(() => {
    const open = () => { void install(); };
    window.addEventListener("elite:install", open);
    return () => window.removeEventListener("elite:install", open);
  });
  return (
    <>
      <div className="pwa-tools">
        <button
          ref={trigger}
          type="button"
          className="text-link"
          aria-expanded={prompt ? undefined : help}
          aria-controls={prompt ? undefined : "pwa-help"}
          onClick={() => void install()}
        >
          {prompt ? "Instalar Elite" : "Instalación de la app"}
          <Icon name="download" />
        </button>
      </div>
      {help && (
        <section
          ref={panel}
          id="pwa-help"
          className="pwa-help surface"
          aria-labelledby="pwa-help-title"
          tabIndex={-1}
        >
          <header className="pwa-help-head">
            <p className="eyebrow">App Elite</p>
            <button
              type="button"
              className="icon-button pwa-help-close"
              aria-label="Cerrar ayuda de instalación"
              onClick={closeHelp}
            >
              <Icon name="close" />
            </button>
          </header>
          <h2 id="pwa-help-title">
            Elite en tu <span className="serif">pantalla de inicio.</span>
          </h2>
          <p>
            {secure
              ? "Si tu navegador lo ofrece: en Android, menú del navegador → «Instalar app» o «Añadir a pantalla de inicio». En iPhone, Safari → Compartir → «Añadir a pantalla de inicio»."
              : "Esta dirección usa HTTP: puedes usar la web, pero la instalación requiere HTTPS o abrirla como localhost en el mismo computador."}
          </p>
          <p>
            La opción depende de cada navegador y dispositivo. Reservas y turnos
            siempre necesitan conexión: la app no guarda operaciones para
            enviarlas después.
          </p>
          <p className="pwa-help-status" role="status">
            <span
              className="pwa-help-dot"
              data-ready={prepared || undefined}
              aria-hidden="true"
            />
            {prepared
              ? "Pantalla sin conexión preparada en este dispositivo."
              : "Preparación sin conexión pendiente o no disponible en este contexto."}
          </p>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={closeHelp}
          >
            Entendido
          </button>
        </section>
      )}
      {(offline || waiting || message) && (
        <div className="pwa-stack">
          {offline && (
            <div className="connection-banner" role="alert">
              <Icon name="offline" />
              <span>
                Sin conexión. No se pueden confirmar reservas, turnos ni
                cambios.
              </span>
            </div>
          )}
          {waiting && (
            <div className="pwa-toast" role="status">
              <span>Hay una versión nueva de Elite lista.</span>
              <button
                type="button"
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
                Actualizar app <Icon name="refresh" />
              </button>
            </div>
          )}
          {message && (
            <p className="pwa-message" role="status">
              {message}
            </p>
          )}
        </div>
      )}
    </>
  );
}
