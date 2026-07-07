import { useState } from "react";
import { View, Text, Linking, Share, StyleSheet } from "react-native";
import { Icon } from "../components/Icon";
import { PressableScale } from "../components/PressableScale";
import { C } from "../theme";
import { haversineKm, intensidadAprox } from "../lib/geo";
import type { Quake } from "../lib/usgs";

type Filtro = "todos" | "m45" | "m6";

const FILTROS: [Filtro, string][] = [
  ["todos", "Todos"],
  ["m45", "M ≥ 4.5"],
  ["m6", "M ≥ 6"],
];

/** Líneas oficiales de emergencia del Perú (gratuitas, 24 h). */
const EMERGENCIA: [string, string][] = [
  ["105", "Policía Nacional"],
  ["116", "Bomberos"],
  ["106", "SAMU · ambulancia"],
  ["115", "INDECI · Defensa Civil"],
];

export function Informacion({ sismos, user }: { sismos: Quake[]; user: { lat: number; lon: number } }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);

  const lista = sismos.filter((q) => (filtro === "m6" ? q.mag >= 6 : filtro === "m45" ? q.mag >= 4.5 : true)).slice(0, 15);

  async function compartir(q: Quake) {
    const dist = Math.round(haversineKm(user.lat, user.lon, q.lat, q.lon));
    const msg =
      `Sismo M ${q.mag} — ${q.place}\n` +
      `${new Date(q.time).toLocaleString("es-PE")} · prof. ${Math.round(q.depth)} km · a ${dist} km de mí\n` +
      `Fuente: ${q.fuente} · vía Perú Preparado`;
    try {
      await Share.share({ message: msg });
    } catch {}
  }

  return (
    <View>
      <Text style={s.sec}>Últimos sismos (IGP + USGS en vivo)</Text>

      {/* Filtros por magnitud */}
      <View style={s.ftabs}>
        {FILTROS.map(([f, lbl]) => (
          <PressableScale key={f} style={[s.ftab, filtro === f && s.ftabOn]} onPress={() => setFiltro(f)}>
            <Text style={[s.ftabT, filtro === f && { color: "#fff" }]}>{lbl}</Text>
          </PressableScale>
        ))}
      </View>

      <View style={s.card}>
        {lista.length === 0 && (
          <Text style={[s.hint, { padding: 12 }]}>
            {sismos.length === 0 ? "Sin datos." : "Ningún sismo con ese filtro en los últimos reportes."}
          </Text>
        )}
        {lista.map((q, i) => {
          const on = abierto === q.id;
          const dist = Math.round(haversineKm(user.lat, user.lon, q.lat, q.lon));
          return (
            <View key={q.id} style={i > 0 ? s.rowBorder : undefined}>
              <PressableScale style={s.row} onPress={() => setAbierto(on ? null : q.id)}>
                <View style={s.rowIc}>
                  <Icon name="pin" size={17} color={C.ink2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowB} numberOfLines={on ? undefined : 1}>
                    {q.place}
                  </Text>
                  <Text style={s.rowS}>
                    {relTime(q.time)} · <Text style={{ color: q.fuente === "IGP" ? C.rojo : C.azul, fontWeight: "800" }}>{q.fuente}</Text>
                  </Text>
                </View>
                <Text style={[s.badge, { color: q.mag >= 6 ? C.rojo : q.mag >= 4.5 ? C.ambar : C.verde, backgroundColor: q.mag >= 6 ? C.rojoSoft : q.mag >= 4.5 ? C.ambarSoft : C.verdeSoft }]}>
                  M {q.mag}
                </Text>
              </PressableScale>

              {on && (
                <View style={s.det}>
                  <View style={s.detGrid}>
                    <Det k="A tu ubicación" v={`${dist} km`} />
                    <Det k="Intensidad aprox. ahí" v={intensidadAprox(q.mag, dist)} />
                    <Det k="Profundidad" v={`${Math.round(q.depth)} km`} />
                    <Det k="Fecha y hora" v={new Date(q.time).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} />
                  </View>
                  <PressableScale style={s.shareBtn} onPress={() => compartir(q)}>
                    <Icon name="broadcast" size={15} color="#fff" />
                    <Text style={s.shareT}>Compartir este sismo</Text>
                  </PressableScale>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Text style={s.sec}>Números de emergencia (24 h, gratuitos)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {EMERGENCIA.map(([num, lbl]) => (
          <PressableScale key={num} style={s.ecall} haptic="medium" onPress={() => Linking.openURL("tel:" + num)}>
            <Text style={s.eNum}>{num}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.eLbl}>{lbl}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Icon name="phone" size={11} color={C.muted} />
                <Text style={s.eHint}>Tocar para llamar</Text>
              </View>
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/** "hace 25 min", "hace 3 h", "ayer", o fecha corta. */
function relTime(t: number): string {
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(t).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

function Det({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ width: "48%" }}>
      <Text style={s.detK}>{k}</Text>
      <Text style={s.detV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  sec: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, color: C.muted, marginTop: 8, marginBottom: 10 },
  ftabs: { flexDirection: "row", gap: 7, marginBottom: 10 },
  ftab: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: C.line, alignItems: "center", backgroundColor: C.surface },
  ftabOn: { backgroundColor: C.rojo, borderColor: C.rojo },
  ftabT: { fontSize: 12.5, fontWeight: "700", color: C.muted },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, overflow: "hidden", marginBottom: 4 },
  hint: { fontSize: 11.5, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  rowIc: { width: 38, height: 38, borderRadius: 9, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  rowB: { fontSize: 14, fontWeight: "700", color: C.ink },
  rowS: { fontSize: 12, color: C.muted, marginTop: 1 },
  badge: { fontSize: 10.5, fontWeight: "800", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, overflow: "hidden" },
  det: { paddingHorizontal: 12, paddingBottom: 13, backgroundColor: C.surface2 },
  detGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 11 },
  detK: { fontSize: 10, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  detV: { fontSize: 13.5, fontWeight: "700", color: C.ink, marginTop: 1 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: C.slate, borderRadius: 9, paddingVertical: 10, marginTop: 12 },
  shareT: { color: "#fff", fontSize: 12.5, fontWeight: "800" },
  ecall: { width: "47%", flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 9, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  eNum: { backgroundColor: C.rojo, color: "#fff", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 5, fontSize: 17, fontWeight: "800", overflow: "hidden" },
  eLbl: { fontSize: 12, fontWeight: "700", color: C.ink },
  eHint: { fontSize: 9.5, color: C.muted, fontWeight: "600" },
});
