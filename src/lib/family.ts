import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile } from "./profile";

/** Miembro de la familia sincronizado (su ficha recibida por QR). */
export interface FamilyMember {
  id: string;
  nombre: string;
  dni: string;
  nacionalidad: string;
  region: string;
  mensaje: string;
  syncedAt: string;
}

export const FAMILY_KEY = "pp_family_v1";
const PREFIX = "PPF1:"; // Perú Preparado · Ficha v1

/** Codifica tu ficha en el texto que llevará el QR. */
export function encodeFicha(p: Profile): string {
  return PREFIX + JSON.stringify({ n: p.nombre, d: p.dni, na: p.nacionalidad, r: p.region, m: p.mensaje });
}

/** Decodifica un QR escaneado. Devuelve null si no es una ficha válida. */
export function decodeFicha(raw: string): Omit<FamilyMember, "id" | "syncedAt"> | null {
  if (!raw || !raw.startsWith(PREFIX)) return null;
  try {
    const o = JSON.parse(raw.slice(PREFIX.length));
    return { nombre: o.n ?? "", dni: o.d ?? "", nacionalidad: o.na ?? "", region: o.r ?? "", mensaje: o.m ?? "" };
  } catch {
    return null;
  }
}

export async function loadFamily(): Promise<FamilyMember[]> {
  try {
    const raw = await AsyncStorage.getItem(FAMILY_KEY);
    return raw ? (JSON.parse(raw) as FamilyMember[]) : [];
  } catch {
    return [];
  }
}

export async function saveFamily(list: FamilyMember[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(list));
  } catch {}
}
