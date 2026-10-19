"use client";
import { useEffect, useRef, useState } from "react";

/** Audio local: el navegador exige un primer clic en la pantalla del televisor. */
export function CallSound({ tickets }: { tickets: { number: string; barber: string }[] | null }) {
  const context = useRef<AudioContext | null>(null);
  const previous = useRef<Set<string> | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState(false);
  const voiceEnabled = useRef(false);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSpeech = useRef("");
  const signature = tickets === null ? null : JSON.stringify(tickets);

  function stopVoice() {
    if (speechTimer.current) clearTimeout(speechTimer.current);
    speechTimer.current = null;
    pendingSpeech.current = "";
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    const message = new SpeechSynthesisUtterance(text);
    message.lang = "es-CO";
    message.rate = .9;
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.find(item => item.lang === "es-CO") ?? voices.find(item => item.lang.startsWith("es"));
    if (spanish) message.voice = spanish;
    message.onerror = event => {
      if (event.error !== "canceled" && event.error !== "interrupted") setError("Voz no disponible en este dispositivo. La campanilla sigue activa.");
    };
    window.speechSynthesis.speak(message);
  }

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
    const calls = JSON.parse(signature) as { number: string; barber: string }[];
    const current = new Set(calls.map(ticket => ticket.number));
    const fresh = previous.current === null ? [] : calls.filter(ticket => !previous.current!.has(ticket.number));
    previous.current = current;
    if (!enabled || !fresh.length) return;
    if (context.current?.state === "running") {
      chime(context.current);
      if (voiceEnabled.current) {
        // Una actualización puede contener varios llamados: se leen en orden.
        const text = fresh.map(ticket => `Turno ${ticket.number.replace(/-/g, " ")}, pasar con ${ticket.barber}.`).join(" ");
        pendingSpeech.current += ` ${text}`;
        if (!speechTimer.current) {
          speechTimer.current = setTimeout(() => {
            speechTimer.current = null;
            const announcement = pendingSpeech.current;
            pendingSpeech.current = "";
            speak(announcement);
          }, 1000);
        }
      }
    }
    else { setEnabled(false); setError("Pulsa para reactivar el sonido."); }
  }, [signature, enabled]);

  useEffect(() => () => { stopVoice(); void context.current?.close().catch(() => {}); context.current = null; }, []);

  async function toggle() {
    if (enabled) { setEnabled(false); stopVoice(); return; }
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
    <label className="monitor-voice"><input type="checkbox" checked={voice} onChange={event => {
      const checked = event.target.checked;
      if (checked && !("speechSynthesis" in window)) { setError("Este navegador no ofrece voz. Puedes usar la campanilla."); return; }
      voiceEnabled.current = checked;
      setVoice(checked);
      setError("");
      if (checked) speak("Avisos de voz activados.");
      else stopVoice();
    }} /> Aviso hablado opcional</label>
    {error && <span role="status">{error}</span>}
  </div>;
}
