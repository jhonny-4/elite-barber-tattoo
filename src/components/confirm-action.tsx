"use client";
import { useId, useRef, type ReactNode } from "react";
export function ConfirmAction({
  children,
  title,
  description,
  onConfirm,
  disabled = false,
}: {
  children: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="table-action"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
      >
        {children}
      </button>
      <dialog className="confirm-dialog" ref={dialog} aria-labelledby={id}>
        <p className="eyebrow">ELITE / GESTIÓN DEMO</p>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
        <div>
          <button
            className="button button-outline button-small"
            onClick={() => dialog.current?.close()}
          >
            Volver
          </button>
          <button
            className="button button-small"
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            Confirmar
          </button>
        </div>
      </dialog>
    </>
  );
}
