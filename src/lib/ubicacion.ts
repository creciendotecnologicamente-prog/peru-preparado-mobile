import * as Location from "expo-location";

export interface Coords {
  lat: number;
  lon: number;
}

/**
 * Mejor posición REAL disponible en pocos segundos, o null.
 * Nunca inventa una posición: si no hay permiso o no hay fix, devuelve null
 * (jamás se debe mandar a la familia una ubicación por defecto tipo "Lima").
 */
export async function ubicacionRapida(timeoutMs = 4000): Promise<Coords | null> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;

    // La última posición conocida es instantánea — en una emergencia vale más
    // responder ya con un fix de hace un rato que esperar al GPS.
    const last = await Location.getLastKnownPositionAsync();
    if (last) return { lat: last.coords.latitude, lon: last.coords.longitude };

    const cur = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return cur ? { lat: cur.coords.latitude, lon: cur.coords.longitude } : null;
  } catch {
    return null;
  }
}

/** Link de Google Maps que abre en cualquier teléfono, con o sin la app. */
export function mapsUrl(lat: number, lon: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lon.toFixed(5)}`;
}
