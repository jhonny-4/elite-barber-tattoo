export const businessName = "Elite Barber & Tattoo";
export const businessCity = "Cartagena de Indias";
export const businessAddress =
  "Los Ejecutivos, Cartagena de Indias, Colombia";

// Búsqueda por dirección: referencia provisional, no un pin verificado del negocio.
// Para cambiarla por el pin confirmado, reemplazar solo `mapQuery`.
const mapQuery = encodeURIComponent(businessAddress);

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
export const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

// Contacto provisional autorizado por el usuario; enlaces externos sin automatización.
export const whatsappUrl = "https://wa.me/573012329541";
export const whatsappDisplay = "+57 301 232 9541";
export const instagramUrl = "https://www.instagram.com/elite_barber_tattoo/";
export const instagramHandle = "@elite_barber_tattoo";
export const artistInstagramUrl =
  "https://www.instagram.com/jeancarlostattoo19/";
export const artistInstagramHandle = "@jeancarlostattoo19";
