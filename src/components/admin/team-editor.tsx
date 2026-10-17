"use client";
import { useState } from "react";
import { barbers } from "../../domain/catalog";
import type { TeamMember } from "../../domain/team/model";
export function TeamEditor({
  member,
  onSave,
  busy,
}: {
  member: TeamMember;
  onSave: (member: TeamMember) => Promise<unknown>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(() => structuredClone(member));
  return (
    <form
      className="v4-card v4-form team-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <h3>{barbers.find((b) => b.id === member.id)?.name}</h3>
      <p>
        Jornada y pausas de ejemplo. Los cambios se revisan contra las citas
        existentes.
      </p>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />{" "}
        Profesional activo
      </label>
      <div className="field-row">
        <label>
          Inicio
          <input
            type="time"
            required
            step="900"
            value={draft.open}
            onChange={(e) => setDraft({ ...draft, open: e.target.value })}
          />
        </label>
        <label>
          Fin
          <input
            type="time"
            required
            step="900"
            value={draft.close}
            onChange={(e) => setDraft({ ...draft, close: e.target.value })}
          />
        </label>
      </div>
      <fieldset>
        <legend>Días de trabajo demo</legend>
        <div className="weekday-options">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, i) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={draft.days.includes(i)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    days: e.target.checked
                      ? [...draft.days, i]
                      : draft.days.filter((d) => d !== i),
                  })
                }
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>
      <h4>Almuerzos y descansos</h4>
      {draft.pauses.map((pause, i) => (
        <div className="period-editor" key={i}>
          <label>
            Motivo
            <input
              required
              maxLength={100}
              value={pause.label}
              onChange={(e) =>
                setDraft({
                  ...draft,
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
                setDraft({
                  ...draft,
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
                setDraft({
                  ...draft,
                  pauses: draft.pauses.map((p, j) =>
                    j === i ? { ...p, end: e.target.value } : p,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              setDraft({
                ...draft,
                pauses: draft.pauses.filter((_, j) => j !== i),
              })
            }
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-link"
        onClick={() =>
          setDraft({
            ...draft,
            pauses: [
              ...draft.pauses,
              { start: "15:00", end: "15:15", label: "Descanso demo" },
            ],
          })
        }
      >
        + Añadir descanso
      </button>
      <h4>Ausencias por fecha</h4>
      {draft.absences.map((absence, i) => (
        <div className="period-editor" key={i}>
          <label>
            Fecha
            <input
              type="date"
              required
              value={absence.date}
              onChange={(e) =>
                setDraft({
                  ...draft,
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
                setDraft({
                  ...draft,
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
                setDraft({
                  ...draft,
                  absences: draft.absences.map((p, j) =>
                    j === i ? { ...p, end: e.target.value } : p,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              setDraft({
                ...draft,
                absences: draft.absences.filter((_, j) => j !== i),
              })
            }
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-link"
        onClick={() =>
          setDraft({
            ...draft,
            absences: [
              ...draft.absences,
              {
                date: "",
                start: draft.open,
                end: draft.close,
                label: "Ausencia demo",
              },
            ],
          })
        }
      >
        + Añadir ausencia
      </button>
      <button className="button" disabled={busy}>
        Guardar jornada demo
      </button>
    </form>
  );
}
