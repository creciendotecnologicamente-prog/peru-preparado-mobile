import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Ficha de prevención del usuario (Test de Conocimiento).
 * Alimenta el porcentaje de preparación y la futura Sincronización Familiar
 * por Bluetooth (es la "tarjeta" que tu familia reconoce en una emergencia).
 * Se guarda SOLO en el dispositivo.
 */
export interface Profile {
  // Identidad
  nombre: string;
  dni: string;
  nacionalidad: string;
  // Familia
  miembros: string; // número de personas en el hogar
  contactoNombre: string;
  contactoTel: string;
  vulnerables: string[]; // adultos mayores, niños, discapacidad, embarazo, mascotas
  // Hogar
  region: string;
  vivienda: string; // Casa / Departamento / Otro
  material: string; // Material noble / Adobe / Madera / Otro
  riesgos: string[]; // Costa / Ladera / Río / Quebrada
  // Preparación (test)
  mochila: boolean;
  zonaSegura: boolean;
  planFamiliar: boolean;
  cortarServicios: boolean;
  // Comunidad
  mensaje: string; // opcional, para otros usuarios
  completedAt?: string;
}

export const PROFILE_KEY = "pp_profile_v1";

export const emptyProfile: Profile = {
  nombre: "", dni: "", nacionalidad: "Peruana",
  miembros: "", contactoNombre: "", contactoTel: "", vulnerables: [],
  region: "", vivienda: "", material: "", riesgos: [],
  mochila: false, zonaSegura: false, planFamiliar: false, cortarServicios: false,
  mensaje: "",
};

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(p: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
}

/**
 * Porcentaje de preparación (0–100). Combina completitud de la ficha
 * (identidad, familia, hogar) con el nivel de preparación real (test).
 */
export function preparedness(p: Profile): number {
  const filled = [
    !!p.nombre.trim(),
    p.dni.trim().length === 8,
    !!p.nacionalidad.trim(),
    !!p.miembros.trim(),
    !!p.contactoNombre.trim(),
    !!p.contactoTel.trim(),
    !!p.region.trim(),
    !!p.vivienda.trim(),
    !!p.material.trim(),
    p.mochila,
    p.zonaSegura,
    p.planFamiliar,
    p.cortarServicios,
  ];
  const score = filled.filter(Boolean).length;
  return Math.round((score / filled.length) * 100);
}

export function nivelPreparacion(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Bien preparado", color: "#157f3c" };
  if (pct >= 50) return { label: "En camino", color: "#b07700" };
  return { label: "Necesitas prepararte", color: "#D52B1E" };
}
