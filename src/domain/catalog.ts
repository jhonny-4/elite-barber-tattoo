export const business = {
  name: "Elite Barber & Tattoo",
  city: "Cartagena",
  timezone: "America/Bogota",
  instagram: "https://www.instagram.com/elite_barber_tattoo/",
  artistInstagram: "https://www.instagram.com/jeancarlostattoo19/",
  address: null,
  phone: null,
  openingHours: null,
  provisional: true,
} as const;

export const services = [
  // Lista oficial del local (cartel de servicios). Los slugs coinciden con public.services.
  { id: "corte", name: "Corte sencillo", priceCOP: 25000, demoDurationMinutes: 45 },
  { id: "corte-barba", name: "Corte y barba", priceCOP: 32000, demoDurationMinutes: 45 },
  { id: "barba", name: "Barba", priceCOP: 18000, demoDurationMinutes: 30 },
  { id: "cerquillos", name: "Cerquillos", priceCOP: 12000, demoDurationMinutes: 15 },
  { id: "ceja", name: "Ceja", priceCOP: 7000, demoDurationMinutes: 15 },
  { id: "mascarilla", name: "Mascarilla", priceCOP: 10000, demoDurationMinutes: 20 },
  { id: "limpieza-facial", name: "Limpieza facial sencilla", priceCOP: 60000, demoDurationMinutes: 45 },
  { id: "limpieza-facial-profunda", name: "Limpieza facial profunda", priceCOP: 80000, demoDurationMinutes: 60 },
] as const;
// IDs históricos del motor local; slug corresponde al catálogo real de reservas.
export const barbers = [
  { id: "barbero-1", slug: "ivan", name: "Ivan" },
  { id: "barbero-2", slug: "jean-carlos", name: "Jeancarlos" },
  { id: "barbero-3", slug: "nelson", name: "Nelson" },
] as const;
export const artist = {
  id: "jean-carlos",
  name: "Jean Carlos",
  pricing: "Cotización según el diseño",
};
export const currency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
