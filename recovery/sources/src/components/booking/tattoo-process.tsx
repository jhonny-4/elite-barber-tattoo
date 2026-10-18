/**
 * Proceso de una solicitud de tatuaje (pendiente → evaluación → cotización →
 * fecha acordada). Refleja los estados del dominio; nunca muestra precio ni
 * confirma una cita automáticamente.
 */
export const tattooSteps = [
  {
    title: "Pendiente",
    text: "Tu solicitud llega al estudio y queda en espera de revisión.",
  },
  {
    title: "Evaluación",
    text: "Jean Carlos revisa personalmente la idea, la zona y el tamaño.",
  },
  {
    title: "Cotización",
    text: "Recibes una propuesta de valor según el diseño, sin tarifas automáticas.",
  },
  {
    title: "Fecha acordada",
    text: "La sesión se agenda contigo cuando el diseño y el valor están claros.",
  },
] as const;

export function TattooProcess({
  current,
  className = "",
}: {
  /** Índice del estado actual (0 = pendiente). Sin valor: solo explica el proceso. */
  current?: number;
  className?: string;
}) {
  return (
    <ol className={`tt-process ${className}`}>
      {tattooSteps.map((step, index) => {
        const state =
          current === undefined
            ? undefined
            : index < current
              ? "done"
              : index === current
                ? "current"
                : "todo";
        return (
          <li
            key={step.title}
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="tt-process-num" aria-hidden="true">
              0{index + 1}
            </span>
            <span className="tt-process-body">
              <strong>
                {step.title}
                {state === "current" && (
                  <span className="tt-process-tag">Estado actual</span>
                )}
              </strong>
              <span>{step.text}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
