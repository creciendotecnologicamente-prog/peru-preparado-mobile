import { View, Text, Image, StyleSheet } from "react-native";
import { C } from "../theme";

const LOGO = require("../../assets/ideagrow.png");
// Relación de aspecto real del asset recortado (733×288).
const RATIO = 733 / 288;

/**
 * Crédito de autoría "Un producto de IdeaGrow" con el logo de la empresa.
 * Se usa en la bienvenida y en el pie de Inicio.
 */
export function IdeaGrowCredit({ width = 108 }: { width?: number }) {
  return (
    <View style={s.wrap}>
      <Text style={s.label}>Un producto de</Text>
      <Image source={LOGO} style={{ width, height: width / RATIO }} resizeMode="contain" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: 7, paddingVertical: 18 },
  label: { fontSize: 10.5, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 1 },
});
