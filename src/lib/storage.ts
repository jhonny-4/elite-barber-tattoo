import { emptyState, tattooStatuses, type DemoState } from "../domain/demo";
import { barbers, services } from "../domain/catalog";
const key = "zenko.elite.demo.v1";
export function readDemo(): DemoState {
  const raw = localStorage.getItem(key);
  if (!raw) return emptyState();
  let state: DemoState;
  const invalid = () =>
    new Error(
      "Los datos demo guardados no son compatibles. Puedes restablecerlos desde el panel.",
    );
  try {
    state = JSON.parse(raw) as DemoState;
  } catch {
    throw invalid();
  }
  if (
    !state ||
    state.version !== 1 ||
    !Array.isArray(state.bookings) ||
    !Array.isArray(state.requests) ||
    (state.unavailableBarberIds !== undefined &&
      (!Array.isArray(state.unavailableBarberIds) ||
        !state.unavailableBarberIds.every((id) =>
          barbers.some((b) => b.id === id),
        ))) ||
    !state.bookings.every(
      (b) =>
        b &&
        ["id", "barberId", "serviceId", "date", "time", "name", "phone"].every(
          (k) => typeof b[k as keyof typeof b] === "string",
        ) &&
        barbers.some((x) => x.id === b.barberId) &&
        services.some((s) => s.id === b.serviceId) &&
        /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
        !Number.isNaN(Date.parse(b.date)) &&
        ["reservada-demo", "cancelada"].includes(b.status),
    ) ||
    !state.requests.every(
      (r) =>
        r &&
        ["id", "name", "phone", "idea", "placement", "size"].every(
          (k) => typeof r[k as keyof typeof r] === "string",
        ) &&
        (r.referenceName === null || typeof r.referenceName === "string") &&
        (r.referenceDataUrl === undefined ||
          (/^data:image\/(jpeg|png|webp);base64,/.test(r.referenceDataUrl) &&
            r.referenceDataUrl.length < 1500000)) &&
        tattooStatuses.includes(r.status),
    )
  )
    throw invalid();
  return state;
}
export function saveDemo(state: DemoState) {
  localStorage.setItem(key, JSON.stringify(state));
}
