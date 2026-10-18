"use client";
import { useEffect, useState } from "react";

// Marca de sesión SOLO para la presentación. sessionStorage no protege nada:
// cualquiera puede escribir esta clave o llamar a la API. Antes de producción hay que
// sustituirlo por inicio de sesión real, sesión verificada en servidor y autorización
// por rol (RLS o equivalente) en cada lectura y escritura de datos.
const key = "elite.owner-preview";
const sessionEvent = "elite-owner-session";

export function useOwnerSession() {
  const [owner, setOwner] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const refresh = () => {
      try {
        setOwner(sessionStorage.getItem(key) === "demo-owner");
      } catch {
        setOwner(false);
      }
      setReady(true);
    };
    refresh();
    window.addEventListener(sessionEvent, refresh);
    return () => window.removeEventListener(sessionEvent, refresh);
  }, []);
  return { owner, ready };
}

/** Abre el panel simulado en esta pestaña. Lanza un error si el navegador bloquea sessionStorage. */
export function beginOwnerDemo() {
  sessionStorage.setItem(key, "demo-owner");
  window.dispatchEvent(new Event(sessionEvent));
}

/** Cierra el panel simulado en esta pestaña. */
export function endOwnerDemo() {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Sin almacenamiento no hay marca que borrar. */
  }
  window.dispatchEvent(new Event(sessionEvent));
}
