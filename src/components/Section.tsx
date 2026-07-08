import { View, Text, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { C } from "../theme";

const TONES = {
  rojo: { bg: C.rojoSoft, fg: C.rojo },
  azul: { bg: C.azulSoft, fg: C.azul },
  verde: { bg: C.verdeSoft, fg: C.verde },
  ambar: { bg: C.ambarSoft, fg: C.ambar },
} as const;

/**
 * Encabezado de sección con ícono, título y una explicación corta.
 * Reemplaza los rótulos EN MAYÚSCULAS sueltos: cada bloque de la app dice
 * qué es en una frase breve. El color (tone) ayuda a distinguir de un
 * vistazo el tipo de sección (rojo=urgente, azul=información, verde=positivo).
 */
export function Section({
  icon,
  title,
  hint,
  tone = "rojo",
}: {
  icon: string;
  title: string;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  const c = TONES[tone];
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View style={[s.ic, { backgroundColor: c.bg }]}>
          <Icon name={icon} size={14} color={c.fg} />
        </View>
        <Text style={s.title}>{title}</Text>
      </View>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 16, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  ic: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15.5, fontWeight: "800", color: C.ink },
  hint: { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 17 },
});
