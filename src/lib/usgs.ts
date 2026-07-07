import { Platform } from "react-native";
import { haversineKm } from "./geo";
import { loadServer } from "./server";

export interface Quake {
  id: string;
  mag: number;
  place: string;
  time: number;
  lon: number;
  lat: number;
  depth: number;
  fuente: "IGP" | "USGS";
}

/**
 * Sismos reales recientes de dos fuentes combinadas:
 *  - IGP (Instituto Geofísico del Perú): fuente oficial, reporta también los
 *    sismos locales pequeños que USGS omite.
 *  - USGS: respaldo y cobertura regional (M≥4 en un radio de 2500 km).
 * Si una fuente falla, la otra sigue sirviendo datos.
 */
export async function fetchSismos(): Promise<Quake[]> {
  // En web el navegador bloquea la API del IGP (CORS): pedimos los sismos a
  // nuestro servidor, que ya combina IGP+USGS del lado del servidor. En
  // nativo vamos directo a las fuentes (más resiliente si el server cae).
  if (Platform.OS === "web") {
    try {
      return await fetchViaServer();
    } catch {
      // Respaldo: USGS sí permite CORS desde el navegador.
      const b = await fetchUsgs();
      if (b.length === 0) throw new Error("Sin datos");
      return b.sort((x, y) => y.time - x.time).slice(0, 30);
    }
  }

  const [igp, usgs] = await Promise.allSettled([fetchIgp(), fetchUsgs()]);
  const a = igp.status === "fulfilled" ? igp.value : [];
  const b = usgs.status === "fulfilled" ? usgs.value : [];
  if (a.length === 0 && b.length === 0) throw new Error("Sin datos de IGP ni USGS");

  // Deduplicación entre fuentes: mismo evento si ocurre casi a la vez y cerca.
  // Se prefiere el registro del IGP (fuente oficial peruana).
  const merged = [...a];
  for (const q of b) {
    const dup = a.some((p) => Math.abs(p.time - q.time) < 3 * 60_000 && haversineKm(p.lat, p.lon, q.lat, q.lon) < 150);
    if (!dup) merged.push(q);
  }
  return merged.sort((x, y) => y.time - x.time).slice(0, 30);
}

async function fetchViaServer(): Promise<Quake[]> {
  const base = await loadServer();
  const res = await fetch(`${base}/api/sismos`);
  if (!res.ok) throw new Error("server " + res.status);
  const json = await res.json();
  const data = (json.data ?? []) as Quake[];
  if (data.length === 0) throw new Error("server sin datos");
  return data;
}

export async function fetchUsgs(): Promise<Quake[]> {
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url =
    "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson" +
    `&starttime=${start}&minmagnitude=4&latitude=-9.19&longitude=-75.02&maxradiuskm=2500&orderby=time&limit=25`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("USGS " + res.status);
  const geo = await res.json();
  return (geo.features ?? []).map(
    (f: any): Quake => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place ?? "—",
      time: f.properties.time,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
      fuente: "USGS",
    }),
  );
}

/**
 * API pública del IGP: /api/ultimo-sismo/ajaxb/{año} devuelve los reportes del
 * año en orden cronológico. fecha_utc trae la fecha (a medianoche) y hora_utc
 * la hora del día (sobre 1970-01-01); se combinan para el timestamp real.
 */
export async function fetchIgp(): Promise<Quake[]> {
  const year = new Date().getFullYear();
  let rows = await igpYear(year);
  if (rows.length < 15) rows = [...(await igpYear(year - 1)), ...rows]; // inicio de año
  return rows
    .map(igpToQuake)
    .filter((q): q is Quake => q !== null)
    .sort((x, y) => y.time - x.time)
    .slice(0, 25);
}

async function igpYear(year: number): Promise<any[]> {
  const res = await fetch(`https://ultimosismo.igp.gob.pe/api/ultimo-sismo/ajaxb/${year}`);
  if (!res.ok) throw new Error("IGP " + res.status);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function igpToQuake(r: any): Quake | null {
  try {
    const fecha = String(r.fecha_utc ?? "").slice(0, 10); // "2026-07-06"
    const hora = String(r.hora_utc ?? "").slice(11, 19); // "14:36:23"
    if (!fecha || !hora) return null;
    const time = Date.parse(`${fecha}T${hora}Z`);
    const mag = parseFloat(r.magnitud);
    const lat = parseFloat(r.latitud);
    const lon = parseFloat(r.longitud);
    if (!Number.isFinite(time) || !Number.isFinite(mag) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      id: "igp-" + (r.codigo ?? r.idlistasismos ?? `${fecha}${hora}`),
      mag,
      place: r.referencia ?? "Perú",
      time,
      lon,
      lat,
      depth: Number(r.profundidad) || 0,
      fuente: "IGP",
    };
  } catch {
    return null;
  }
}
