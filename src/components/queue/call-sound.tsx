"use client";
import { useEffect, useRef, useState } from "react";

/** Audio local: el navegador exige un primer clic en la pantalla del televisor. */
export function CallSound({ numbers }: { numbers: string[] | null }) {
  const context = useRef<AudioContext | null>(null);
  const previous = useRef<Set<string> | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const signature = numbers === null ? null : JSON.stringify(numbers);

  function chime(audio: AudioContext) {
    const start = audio.currentTime + .02;
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const at = start + index * .24;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(.18, at + .025);
      gain.gain.exponentialRampToValueAtTime(.001, at + .65);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + .7);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }

  useEffect(() => {
    if (signature === null) return;
    const current = new Set<string>(JSON.parse(signature));
    const fresh = previous.current !== null && [...current].some(number => !previous.current!.has(number));
    previous.current = current;
    if (!enabled || !fresh) return;
    if (context.current?.state === "running") chime(context.current);
    else { setEnabled(false); setError("Pulsa para reactivar el sonido."); }
  }, [signature, enabled]);

  useEffect(() => () => { void context.current?.close().catch(() => {}); context.current = null; }, []);

  async function toggle() {
    if (enabled) { setEnabled(false); return; }
    try {
      if (!context.current || context.current.state === "closed") context.current = new AudioContext();
      await context.current.resume();
      if (context.current.state !== "running") throw new Error("Audio bloqueado");
      chime(context.current);
      setEnabled(true);
      setError("");
    } catch { setEnabled(false); setError("No se pudo activar. Revisa el audio del televisor y vuelve a pulsar."); }
  }

  return <div className="monitor-audio">
    <button type="button" className="button button-outline button-small" aria-pressed={enabled} onClick={() => void toggle()}>{enabled ? "Sonido activado · silenciar" : "Activar sonido de llamados"}</button>
    {error && <span role="status">{error}</span>}
  </div>;
}
