/** Validación de contacto compartida por reserva y tatuajes (también probada con node --test). */
export type ContactValue = { name: string; phone: string; email?: string };
export type ContactErrors = Partial<Record<keyof ContactValue, string>>;

/** Mismo patrón que valida el dominio (`addBooking`, `addTattooRequest`). */
export const phonePattern = /^[+\d\s()-]{7,20}$/;

export function validateContact(value: ContactValue): ContactErrors {
  const errors: ContactErrors = {};
  if (!value.name.trim()) errors.name = "Escribe un nombre para la solicitud.";
  else if (value.name.trim().length > 100)
    errors.name = "El nombre admite hasta 100 caracteres.";
  if (!value.phone.trim()) errors.phone = "Escribe un teléfono de contacto.";
  else if (!phonePattern.test(value.phone.trim()) || !/^(?:\+?57)?\d{10}$/.test(value.phone.replace(/[\s()-]/g, "")))
    errors.phone = "Usa un celular colombiano de 10 dígitos o +57 seguido de 10 dígitos.";
  if (value.email !== undefined) {
    if (!value.email.trim()) errors.email = "Escribe tu correo electrónico.";
    else if (value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = "Escribe un correo válido.";
  }
  return errors;
}
