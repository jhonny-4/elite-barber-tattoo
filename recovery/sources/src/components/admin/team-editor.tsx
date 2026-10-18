"use client";
import { useId, useState } from "react";
import { barbers } from "../../domain/catalog";
import type { TeamMember } from "../../domain/team/model";
import { Icon } from "../icons";
import { StatusBadge } from "./ui";

const weekdays = [
  [1, "Lun", "Lunes"],
  [2, "Mar", "Martes"],
  [3, "Mié", "Miércoles"],
  [4, "Jue", "Jueves"],
  [5, "Vie", "Viernes"],
  [6, "Sáb", "Sábado"],
  [0, "Dom", "Domingo"],
] as const;

/** Editor de jornada de un profesional. El servidor valida contra las citas existentes. */
export function TeamEditor({
  member,
  onSave,
  busy,
  saving = false,
}: {
  member: TeamMember;
  onSave: (member: TeamMember) => Promise<unknown>;
  /** Otra operación en curso o sin conexión. */
  busy: boolean;
  /** Esta jornada se está guardando. */
  saving?: boolean;
}) {
  const [draft, setDraft] = useState(() => structuredClone(member));
  const id = useId();
  const name = barbers.find((b) => b.id === member.id)?.name ?? member.id;
  const dirty = JSON.stringify(draft) !== JSON.stringify(member);
  const days = weekdays.filter(([day]) => member.days.includes(day));
  const update = (patch: Partial<TeamMember>) => setDraft({ ...draft, ...patch });

  return (
    <form
      className="surface adm-editor"
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <div className="adm-editor-head">
        <div>
          <h3 id={`${id}-title`}>{name}</h3>
          <p className="adm-editor-summary">
            {member.active
              ? `${member.open}–${member.close} · ${
                  days.length === 7
                    ? "Todos los días"
                    : days.length
                      ? days.map(([, short]) => short).join(", ")
                      : "Sin días de trabajo"
                }`
              : "No recibe reservas ni turnos"}
          </p>
        </div>
        <StatusBadge tone={member.active ? "ok" : "muted"}>
          {member.active ? "Activo" : "Inactivo"}
        </StatusBadge>
      </div>

      <div className="adm-editor-grid">
        <div className="adm-editor-col">
          <label className="adm-switch">
            <span>
              <strong>Profesional activo</strong>
              <small>Si lo desactivas, no recibe reservas ni turnos.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={draft.active}
              onChange={(e) => update({ active: e.target.checked })}
            />
          </label>
          <fieldset>
            <legend>Jornada de ejemplo</legend>
            <div className="adm-pair">
              <label>
                Inicio
                <input
                  type="time"
                  required
                  step="900"
                  value={draft.open}
                  onChange={(e) => update({ open: e.target.value })}
                />
              </label>
              <label>
                Fin
                <input
                  type="time"
                  required
                  step="900"
                  value={draft.close}
                  onChange={(e) => update({ close: e.target.value })}
                />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Días de trabajo</legend>
            <div className="adm-daypick">
              {weekdays.map(([day, short, long]) => (
                <label key={day} className="adm-daychip">
                  <input
                    type="checkbox"
                    checked={draft.days.includes(day)}
                    onChange={(e) =>
                      update({
                        days: e.target.checked
                          ? [...draft.days, day].sort()
                          : draft.days.filter((d) => d !== day),
                      })
                    }
                  />
                  <span aria-hidden="true">{short}</span>
                  <span className="visually-hidden">{long}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="adm-editor-col">
          <fieldset>
            <legend>Almuerzos y descansos</legend>
            {draft.pauses.length ? (
              <div className="adm-periods">
                {draft.pauses.map((pause, i) => (
                  <div className="adm-period" key={i}>
                    <label className="adm-period-main">
                      Motivo
                      <input
                        required
                        maxLength={100}
                        value={pause.label}
                        onChange={(e) =>
                          update({
                            pauses: draft.pauses.map((p, j) =>
                              j === i ? { ...p, label: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Desde
                      <input
                        type="time"
                        required
                        value={pause.start}
                        onChange={(e) =>
                          update({
                            pauses: draft.pauses.map((p, j) =>
                              j === i ? { ...p, start: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        type="time"
                        required
                        value={pause.end}
                        onChange={(e) =>
                          update({
                            pauses: draft.pauses.map((p, j) =>
                              j === i ? { ...p, end: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-button adm-period-remove"
                      aria-label={`Quitar descanso ${pause.label || i + 1}`}
                      onClick={() =>
                        update({ pauses: draft.pauses.filter((_, j) => j !== i) })
                      }
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="adm-quiet">Sin descansos fijos.</p>
            )}
            <button
              type="button"
              className="button button-outline button-small adm-add"
              onClick={() =>
                update({
                  pauses: [
                    ...draft.pauses,
                    { start: "15:00", end: "15:15", label: "Descanso" },
                  ],
                })
              }
            >
              <Icon name="plus" />
              Añadir descanso
            </button>
          </fieldset>
          <fieldset>
            <legend>Ausencias por fecha</legend>
            {draft.absences.length ? (
              <div className="adm-periods">
                {draft.absences.map((absence, i) => (
                  <div className="adm-period" key={i}>
                    <label className="adm-period-main">
                      Fecha
                      <input
                        type="date"
                        required
                        value={absence.date}
                        onChange={(e) =>
                          update({
                            absences: draft.absences.map((p, j) =>
                              j === i ? { ...p, date: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Desde
                      <input
                        type="time"
                        required
                        value={absence.start}
                        onChange={(e) =>
                          update({
                            absences: draft.absences.map((p, j) =>
                              j === i ? { ...p, start: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        type="time"
                        required
                        value={absence.end}
                        onChange={(e) =>
                          update({
                            absences: draft.absences.map((p, j) =>
                              j === i ? { ...p, end: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-button adm-period-remove"
                      aria-label={`Quitar ausencia ${absence.date || i + 1}`}
                      onClick={() =>
                        update({
                          absences: draft.absences.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="adm-quiet">Sin ausencias programadas.</p>
            )}
            <button
              type="button"
              className="button button-outline button-small adm-add"
              onClick={() =>
                update({
                  absences: [
                    ...draft.absences,
                    {
                      date: "",
                      start: draft.open,
                      end: draft.close,
                      label: "Ausencia",
                    },
                  ],
                })
              }
            >
              <Icon name="plus" />
              Añadir ausencia
            </button>
          </fieldset>
        </div>
      </div>

      <div className="adm-editor-foot">
        <p className="adm-dirty" aria-live="polite">
          {dirty ? "Cambios sin guardar" : "Sin cambios pendientes"}
        </p>
        <div className="adm-editor-buttons">
          <button
            type="button"
            className="button button-outline button-small"
            disabled={!dirty || saving}
            onClick={() => setDraft(structuredClone(member))}
          >
            Descartar
          </button>
          <button
            className="button button-small"
            disabled={!saving && (busy || !dirty)}
            aria-busy={saving || undefined}
          >
            <Icon name="check" />
            Guardar jornada
          </button>
        </div>
      </div>
    </form>
  );
}
