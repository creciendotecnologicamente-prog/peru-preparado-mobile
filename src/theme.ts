/**
 * Sistema de color de Perú Preparado.
 *
 * Principio rector: la app transmite CALMA en condiciones normales (azules
 * profundos, mucho blanco) y reserva el rojo EXCLUSIVAMENTE para estados de
 * emergencia — así el color por sí solo comunica gravedad.
 */
export const C = {
  // Marca (azul profundo institucional)
  primario: "#1B4E8A",
  primarioD: "#143C6C",
  primarioSoft: "#E9F0F9",
  marino: "#0E2A47", // héroes, tarjetas oscuras, texto de máximo contraste

  // Lienzo
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  surface2: "#EFF3F9",
  ink: "#15202B",
  ink2: "#3B4C5E",
  muted: "#68798C",
  line: "#E2E9F2",

  // SOLO emergencias (nunca como color de marca)
  alerta: "#DE2F2F",
  alertaD: "#B32222",
  alertaSoft: "#FCEDED",

  // Semánticos
  verde: "#178A50",
  verdeSoft: "#E8F5EF",
  azul: "#1B6FD0",
  azulSoft: "#EAF2FC",
  ambar: "#B07700",
  ambarSoft: "#FFF6E0",

  // ── Alias heredados (código previo) ──────────────────────────────
  // "rojo" queda mapeado al color de alerta: todo uso restante de rojo
  // significa peligro. Los usos de marca fueron migrados a `primario`.
  rojo: "#DE2F2F",
  rojoD: "#B32222",
  rojoSoft: "#FCEDED",
  slate: "#0E2A47",
};
