"use client";
import { Icon } from "../icons";
import { steps, type StepId } from "./copy";

/**
 * Indicador de progreso de la reserva: paso actual en rojo (aria-current),
 * completados en blanco y reutilizables como botón para volver.
 */
export function BookingProgress({
  step,
  onGo,
}: {
  step: StepId;
  onGo: (step: StepId) => void;
}) {
  return (
    <nav className="bk-progress" aria-label="Progreso de la reserva">
      <ol>
        {steps.map((item) => {
          const state =
            item.id < step ? "done" : item.id === step ? "current" : "todo";
          const content = (
            <>
              <span className="bk-puck" aria-hidden="true">
                {state === "done" ? <Icon name="check" /> : `0${item.id}`}
              </span>
              <span className="bk-progress-label">{item.label}</span>
            </>
          );
          return (
            <li key={item.id} className={`bk-progress-step is-${state}`}>
              {state === "done" ? (
                <button
                  type="button"
                  onClick={() => onGo(item.id)}
                  aria-label={`Paso ${item.id} de ${steps.length}: ${item.title}, completado. Volver a este paso`}
                >
                  {content}
                </button>
              ) : (
                <span aria-current={state === "current" ? "step" : undefined}>
                  <span className="visually-hidden">Paso {item.id}: </span>
                  {content}
                  <span className="visually-hidden">
                    {state === "current" ? ", paso actual" : ", pendiente"}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
