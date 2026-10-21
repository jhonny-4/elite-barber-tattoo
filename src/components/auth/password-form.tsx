"use client";
import { useActionState } from "react";
import { setPassword, type FormState } from "../../server/auth/actions";
import { Icon } from "../icons";

export function PasswordForm() {
  const [state, save, pending] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <form className="elite-login-form" action={save}>
      <p className="eyebrow"><Icon name="lock" /> Tu cuenta</p>
      <h2>Crea tu <span className="serif">contraseña.</span></h2>
      <label htmlFor="new-password">Nueva contraseña (mínimo 10 caracteres)</label>
      <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      <label htmlFor="confirm-password">Repítela</label>
      <input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      {state.error && <p className="inline-error" role="alert">{state.error}</p>}
      <button type="submit" className="button button-accent button-large" disabled={pending}>
        {pending ? "Guardando…" : "Guardar y entrar"} <Icon name="arrow" />
      </button>
    </form>
  );
}
