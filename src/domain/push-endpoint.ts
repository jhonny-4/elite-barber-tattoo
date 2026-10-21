/**
 * Solo se aceptan endpoints de los servicios push oficiales de los navegadores.
 * Evita que el servidor haga peticiones a destinos arbitrarios (SSRF): https, puerto
 * por defecto, sin IP literal y con dominio en la lista permitida.
 */
const allowed = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /\.push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
];

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && !url.port && !url.username && !url.password && allowed.some((r) => r.test(host));
  } catch {
    return false;
  }
}
