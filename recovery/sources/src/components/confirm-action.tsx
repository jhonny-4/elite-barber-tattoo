"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";

/**
 * Botón que pide confirmación en un diálogo modal nativo (`showModal`):
 * el resto de la página queda inerte, el foco entra en «Volver» (la opción segura),
 * Esc o un clic fuera cierran sin hacer nada y el foco vuelve al botón de origen.
 */
export function ConfirmAction({
  children,
  title,
  description,
  onConfirm,
  disabled = false,
  busy = false,
  className = "button button-danger button-small",
  confirmLabel = "Confirmar",
  cancelLabel = "Volver",
  eyebrow = "Elite / Panel de gestión",
}: {
  children: ReactNode;
  title: string;
  description: string;
  onConfirm: () => unknown;
  disabled?: boolean;
  /** Operación en curso: el botón muestra `aria-busy` y no admite otro clic. */
  busy?: boolean;
  className?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  eyebrow?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (open && node && !node.open) node.showModal();
  }, [open]);

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={className}
        disabled={disabled}
        aria-busy={busy || undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open ? (
        <dialog
          ref={dialog}
          className="adm-dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
          onClick={(event) => {
            // Un clic en el fondo (fuera del contenido) equivale a «Volver».
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="adm-dialog-body">
            <span className="adm-dialog-icon" aria-hidden="true">
              <Icon name="alert" />
            </span>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId} className="adm-dialog-text">
              {description}
            </p>
            <div className="adm-dialog-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={close}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => {
                  close();
                  void onConfirm();
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
