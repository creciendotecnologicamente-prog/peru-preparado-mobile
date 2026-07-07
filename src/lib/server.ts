import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/**
 * Servidor Perú Te Busca: URL base compartida por toda la app (Red Malla,
 * buscador de personas, reportes al COE). Se guarda bajo la MISMA clave que
 * usa la sala de la Red Malla, así configurarlo en un lugar sirve para todo.
 */
export const SERVER_KEY = "pp_mesh_server";

/** Servidor de producción real (Fly.io, Sao Paulo). */
export const PRODUCTION_SERVER = "https://peru-te-busca.fly.dev";

/**
 * Por defecto:
 *  - En desarrollo (Expo Go/dev client con Metro): la máquina que sirve
 *    Metro, puerto 3000 — para probar contra un `next dev` local.
 *  - En cualquier otro caso (build de producción, web publicada): el
 *    servidor real desplegado.
 */
export function defaultServer(): string {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (__DEV__ && host) return `http://${host}:3000`;
  return PRODUCTION_SERVER;
}

export async function loadServer(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(SERVER_KEY);
    return (v ?? defaultServer()).trim().replace(/\/$/, "");
  } catch {
    return defaultServer();
  }
}

export function saveServer(url: string) {
  AsyncStorage.setItem(SERVER_KEY, url.trim().replace(/\/$/, "")).catch(() => {});
}

// ---------- Cliente de la API de personas y reportes ----------

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  edad?: number;
  region: string;
  lugar: string;
  desc?: string;
  rep: string;
  tel: string;
  estado: "buscado" | "encontrado";
  creado: string;
  dniVerificado: boolean;
}

export interface PersonaNueva {
  nombre: string;
  apellido: string;
  dni: string;
  region: string;
  lugar: string;
  desc?: string;
  rep: string;
  tel: string;
}

export const REGIONES = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca",
  "Callao", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad",
  "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco",
  "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

async function req(base: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const det = json?.detalles ? " · " + Object.entries(json.detalles).map(([k, v]: [string, any]) => `${k}: ${v}`).join("; ") : "";
    throw new Error((json?.error ?? `Error ${res.status}`) + det);
  }
  return json;
}

export async function listarPersonas(base: string, q?: string): Promise<Persona[]> {
  const sp = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const json = await req(base, `/api/personas${sp}`);
  return (json.data ?? []) as Persona[];
}

export async function crearPersona(base: string, input: PersonaNueva): Promise<Persona> {
  const json = await req(base, "/api/personas", { method: "POST", body: JSON.stringify(input) });
  return json.data as Persona;
}

export async function marcarEncontrado(base: string, id: string): Promise<void> {
  await req(base, `/api/personas/${id}/encontrado`, { method: "PATCH" });
}

export async function enviarReporte(
  base: string,
  r: { tipo: "emergencia" | "a-salvo"; ubicacion?: string; nombre?: string; dni?: string; detalle?: string },
): Promise<void> {
  await req(base, "/api/reportes", { method: "POST", body: JSON.stringify(r) });
}
