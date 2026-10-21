"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";

type Fresh = { id: string; title: string; body: string };
const prefKey = "elite.panel-alerts";

/** Doble tono breve, generado con Web Audio (sin archivos). */
function chime(audio: AudioContext) {
  const now = audio.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.45);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.5);
  });
}

/**
 * Alertas del panel: sonido y notificación del sistema (computador y móvil) cuando llegan
 * citas, turnos o solicitudes nuevas mientras el panel está abierto o en segundo plano.
 * Los navegadores exigen activarlas con un toque: por eso el botón.
 */
export function PanelAlerts() {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState("");
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(prefKey) === "1" && "Notification" in window && Notification.permission === "granted") setOn(true);
    } catch {
      /* Sin almacenamiento: quedan apagadas hasta activarlas. */
    }
  }, []);

  useEffect(() => {
    if (!on) return;
    const handle = (event: Event) => {
      const fresh = (event as CustomEvent<Fresh[]>).detail;
      if (!fresh?.length) return;
      if (audio.current && audio.current.state !== "closed") {
        void audio.current.resume().then(() => audio.current && chime(audio.current));
      }
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const first = fresh[0];
      const title = fresh.length > 1 ? `${fresh.length} novedades en Elite` : first.title;
      const options: NotificationOptions = { body: fresh.length > 1 ? fresh.map((f) => f.title).join(" · ") : first.body, icon: "/pwa/icons/elite-192.png", badge: "/pwa/icons/elite-192.png", tag: first.id };
      // Android exige mostrarla desde el service worker; en escritorio basta la API directa.
      void navigator.serviceWorker?.getRegistration().then((reg) => {
        if (reg) return reg.showNotification(title, options);
        new Notification(title, options);
      }).catch(() => undefined);
    };
    window.addEventListener("elite-panel-new", handle);
    return () => window.removeEventListener("elite-panel-new", handle);
  }, [on]);

  async function toggle() {
    if (on) {
      setOn(false);
      try { localStorage.removeItem(prefKey); } catch { /* sin almacenamiento */ }
      return;
    }
    audio.current ??= new AudioContext();
    await audio.current.resume();
    chime(audio.current);
    if (!("Notification" in window)) {
      setNote("Este navegador no permite notificaciones; solo sonará. En iPhone, instala la app en la pantalla de inicio.");
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") setNote("Permiso de notificaciones bloqueado. Actívalo en la configuración del navegador; mientras tanto solo sonará.");
      else setNote("");
    }
    setOn(true);
    try { localStorage.setItem(prefKey, "1"); } catch { /* sin almacenamiento */ }
  }

  return (
    <div className="panel-alerts">
      <button type="button" className={`button ${on ? "button-accent" : "button-outline"}`} aria-pressed={on} onClick={() => void toggle()}>
        <Icon name="bell" /> {on ? "Alertas activas" : "Activar alertas con sonido"}
      </button>
      {note && <p className="adm-hint" role="status">{note}</p>}
    </div>
  );
}
