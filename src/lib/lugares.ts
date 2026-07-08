/**
 * Lugares de referencia ante un sismo en Lima Metropolitana.
 * Coordenadas reales aproximadas. En producción vendrían de una API oficial
 * (INDECI / municipalidades); aquí sirven de base para el mapa y las rutas.
 */
export type TipoLugar = "zona" | "hospital" | "refugio";

export interface Lugar {
  id: string;
  tipo: TipoLugar;
  nombre: string;
  zona: string;
  lat: number;
  lon: number;
}

export const LUGARES: Lugar[] = [
  // Zonas seguras / puntos de concentración (parques y explanadas amplias)
  { id: "z1", tipo: "zona", nombre: "Parque Kennedy", zona: "Miraflores", lat: -12.1211, lon: -77.0295 },
  { id: "z2", tipo: "zona", nombre: "Campo de Marte", zona: "Jesús María", lat: -12.0715, lon: -77.0432 },
  { id: "z3", tipo: "zona", nombre: "Parque de la Reserva", zona: "Cercado de Lima", lat: -12.0703, lon: -77.0341 },
  { id: "z4", tipo: "zona", nombre: "Plaza de Armas", zona: "Cercado de Lima", lat: -12.0464, lon: -77.0303 },
  { id: "z5", tipo: "zona", nombre: "Parque Universitario", zona: "Cercado de Lima", lat: -12.0556, lon: -77.0344 },
  { id: "z6", tipo: "zona", nombre: "Parque El Olivar", zona: "San Isidro", lat: -12.0975, lon: -77.0378 },
  { id: "z7", tipo: "zona", nombre: "Costa Verde (malecón alto)", zona: "Barranco", lat: -12.1490, lon: -77.0224 },

  // Hospitales
  { id: "h1", tipo: "hospital", nombre: "Hospital Nacional Dos de Mayo", zona: "Cercado de Lima", lat: -12.0567, lon: -77.0179 },
  { id: "h2", tipo: "hospital", nombre: "Hospital Rebagliati (EsSalud)", zona: "Jesús María", lat: -12.0793, lon: -77.0419 },
  { id: "h3", tipo: "hospital", nombre: "Hospital Loayza", zona: "Cercado de Lima", lat: -12.0503, lon: -77.0447 },
  { id: "h4", tipo: "hospital", nombre: "Clínica Ricardo Palma", zona: "San Isidro", lat: -12.0938, lon: -77.0243 },
  { id: "h5", tipo: "hospital", nombre: "Hospital del Niño", zona: "Breña", lat: -12.0642, lon: -77.0466 },

  // Albergues / refugios de referencia
  { id: "r1", tipo: "refugio", nombre: "Estadio Nacional", zona: "Cercado de Lima", lat: -12.0672, lon: -77.0333 },
  { id: "r2", tipo: "refugio", nombre: "Coliseo Dibós", zona: "San Borja", lat: -12.1027, lon: -77.0003 },
  { id: "r3", tipo: "refugio", nombre: "Explanada Costa Verde", zona: "Magdalena", lat: -12.0955, lon: -77.0733 },
];

export const TIPO_INFO: Record<TipoLugar, { label: string; plural: string; icon: string; color: string }> = {
  zona: { label: "Zona segura", plural: "Zonas seguras", icon: "tree", color: "#178A50" },
  hospital: { label: "Hospital", plural: "Hospitales", icon: "hospital", color: "#1B6FD0" },
  refugio: { label: "Refugio", plural: "Refugios", icon: "home", color: "#B07700" },
};
