/**
 * Física de la Alerta Sísmica Temprana (idéntica a la versión web — lógica pura).
 * La onda S (destructiva) viaja a ~3.5 km/s; la alerta viaja casi instantánea,
 * adelantándose. Segundos de aviso ≈ distancia / 3.5.
 */
export const S_WAVE_KMS = 3.5;

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function secondsUntilShaking(distKm: number, originMs: number, nowMs: number = Date.now()): number {
  return (originMs + (distKm / S_WAVE_KMS) * 1000 - nowMs) / 1000;
}

export function intensidadAprox(mag: number, distKm: number): string {
  const i = 1.5 * mag - 1.3 * Math.log10(Math.max(distKm, 1)) - 0.5;
  const r = Math.max(1, Math.min(10, Math.round(i)));
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][r];
}
