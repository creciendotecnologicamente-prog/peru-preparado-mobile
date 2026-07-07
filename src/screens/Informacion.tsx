import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { Icon } from "../components/Icon";
import { C } from "../theme";
import type { Quake } from "../lib/usgs";

export function Informacion({ sismos }: { sismos: Quake[] }) {
  return (
    <View>
      <Text style={s.sec}>Últimos sismos (IGP + USGS en vivo)</Text>
      <View style={s.card}>
        {sismos.length === 0 && <Text style={[s.hint, { padding: 12 }]}>Sin datos.</Text>}
        {sismos.slice(0, 12).map((q, i) => (
          <View key={q.id} style={[s.row, i > 0 && s.rowBorder]}>
            <View style={s.rowIc}>
              <Icon name="pin" size={17} color={C.ink2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowB} numberOfLines={1}>
                M {q.mag} · {q.place}
              </Text>
              <Text style={s.rowS}>
                Prof. {Math.round(q.depth)} km · {q.fuente} · {new Date(q.time).toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
              </Text>
            </View>
            <Text style={[s.badge, { color: q.mag >= 6 ? C.rojo : q.mag >= 4.5 ? C.ambar : C.verde, backgroundColor: q.mag >= 6 ? C.rojoSoft : q.mag >= 4.5 ? C.ambarSoft : C.verdeSoft }]}>M {q.mag}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sec}>Números de emergencia</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {([["105", "Policía"], ["116", "Bomberos"], ["106", "SAMU"], ["119", "INDECI"]] as [string, string][]).map(([num, lbl]) => (
          <Pressable key={num} style={s.ecall} onPress={() => Linking.openURL("tel:" + num)}>
            <Text style={s.eNum}>{num}</Text>
            <Text style={s.eLbl}>{lbl}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sec: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, color: C.muted, marginTop: 8, marginBottom: 10 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, overflow: "hidden" },
  hint: { fontSize: 11.5, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  rowIc: { width: 38, height: 38, borderRadius: 9, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  rowB: { fontSize: 14, fontWeight: "700", color: C.ink },
  rowS: { fontSize: 12, color: C.muted, marginTop: 1 },
  badge: { fontSize: 10.5, fontWeight: "800", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, overflow: "hidden" },
  ecall: { width: "47%", flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 9, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  eNum: { backgroundColor: C.rojo, color: "#fff", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 5, fontSize: 17, fontWeight: "800", overflow: "hidden" },
  eLbl: { fontSize: 12.5, fontWeight: "600", color: C.ink },
});
