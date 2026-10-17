export const businessAddress =
  "Cra. 59b #mz50-24, barrio Chiquinquirá, Cartagena de Indias, Bolívar";

// Búsqueda por dirección: referencia provisional, no un pin verificado del negocio.
// Para cambiarla por el pin confirmado, reemplazar solo `mapQuery`.
const mapQuery = encodeURIComponent(businessAddress);

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
export const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
