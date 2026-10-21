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
  { id: "corte", name: "Corte", priceCOP: 25000, demoDurationMinutes: 30 },
  {
    id: "corte-barba",
    name: "Corte con barba",
    priceCOP: 32000,
    demoDurationMinutes: 45,
  },
] as const;
export const barbers = [
  { id: "barbero-1", name: "Barbero 1" },
  { id: "barbero-2", name: "Barbero 2" },
  { id: "barbero-3", name: "Barbero 3" },
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
