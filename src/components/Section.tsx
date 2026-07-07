import { View, Text, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { C } from "../theme";

/**
 * Encabezado de sección con ícono, título y una explicación en una línea.
 * Reemplaza los rótulos EN MAYÚSCULAS sueltos: cada bloque de la app dice
 * qué es y para qué sirve, en lenguaje simple.
 */
export function Section({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View style={s.ic}>
          <Icon name={icon} size={14} color={C.rojo} />
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
  ic: { width: 24, height: 24, borderRadius: 7, backgroundColor: C.rojoSoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15.5, fontWeight: "800", color: C.ink },
  hint: { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 17 },
});
