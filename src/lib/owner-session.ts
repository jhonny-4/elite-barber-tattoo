"use client";
import { useEffect, useState } from "react";
const key = "elite.owner-preview";
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
    window.addEventListener("elite-owner-session", refresh);
    return () => window.removeEventListener("elite-owner-session", refresh);
  }, []);
  return { owner, ready };
}
// Presentation-only role. Replace with verified server session + RLS before production.
export function beginOwnerDemo() {
  sessionStorage.setItem(key, "demo-owner");
  window.dispatchEvent(new Event("elite-owner-session"));
}
export function endOwnerDemo() {
  sessionStorage.removeItem(key);
  window.dispatchEvent(new Event("elite-owner-session"));
}
