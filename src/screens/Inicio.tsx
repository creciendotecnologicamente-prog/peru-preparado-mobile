import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { Icon } from "../components/Icon";
import { C } from "../theme";
import { haversineKm } from "../lib/geo";
import type { Quake } from "../lib/usgs";

export function Inicio({
  sismos, user, monitor, setMonitor, onSimular, goTo, onReportar, onSafe, onBuscar, alertas,
}: {
  sismos: Quake[];
  user: { lat: number; lon: number };
  monitor: boolean;
  setMonitor: (v: boolean) => void;
  onSimular: () => void;
  goTo: (v: "prevencion" | "informacion" | "comunicar") => void;
  onReportar: () => void;
  onSafe: () => void;
  onBuscar: () => void;
  alertas: { id: string; tipo: string; msg: string; nivel: string }[];
}) {
  const u = sismos[0];
  return (
    <View>
      <Pressable style={s.eew} onPress={onSimular}>
        <Icon name="zap" size={28} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={s.eewT}>Alerta Sísmica Temprana</Text>
          <Text style={s.eewS}>Recibe el aviso ANTES del remezón · toca para simular</Text>
        </View>
      </Pressable>

      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <Switch value={monitor} onValueChange={setMonitor} trackColor={{ true: C.rojo }} />
          <View style={{ flex: 1 }}>
            <Text style={s.bold}>Monitor en vivo (IGP + USGS)</Text>
            <Text style={s.hint}>Dispara la alerta ante un sismo real M≥4.5 en la región</Text>
          </View>
        </View>
      </View>

      <Text style={s.sec}>Último sismo (IGP + USGS en vivo)</Text>
      {u ? (
        <View style={s.sismo}>
          <Text style={s.sHdr}>Fuente: {u.fuente} · evento real</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 6 }}>
            <Text style={s.mag}>{u.mag}</Text>
            <Text style={s.magU}>magnitud</Text>
          </View>
          <View style={s.meta}>
            <Meta k="Profundidad" v={`${Math.round(u.depth)} km`} />
            <Meta k="A tu ubicación" v={`${Math.round(haversineKm(user.lat, user.lon, u.lat, u.lon))} km`} />
            <Meta k="Referencia" v={u.place} wide />
          </View>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.hint}>Cargando datos reales…</Text>
        </View>
      )}

      <Text style={s.sec}>Acceso rápido</Text>
      <View style={s.grid}>
        <Tile icon="shield" label="Prevención" onPress={() => goTo("prevencion")} />
        <Tile icon="broadcast" label="Información" onPress={() => goTo("informacion")} />
        <Tile icon="message" label="Comunicar" onPress={() => goTo("comunicar")} />
        <Tile icon="alert" label="Reportar" onPress={onReportar} />
        <Tile icon="check" label="Estoy a salvo" onPress={onSafe} />
        <Tile icon="search" label="Buscar persona" onPress={onBuscar} />
      </View>

      <Text style={s.sec}>Alertas activas</Text>
      <View style={s.card}>
        {alertas.length === 0 ? (
          <Text style={s.hint}>No hay alertas activas. Mantente preparado.</Text>
        ) : (
          alertas.map((a, i) => (
            <View key={a.id} style={[s.aRow, i > 0 && s.aBorder]}>
              <View style={[s.aDot, { backgroundColor: a.nivel === "rojo" ? C.rojo : a.nivel === "amarillo" ? "#c69200" : C.verde }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.aTipo}>{a.tipo}</Text>
                <Text style={s.aMsg}>{a.msg}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function Meta({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <View style={{ width: wide ? "100%" : "48%" }}>
      <Text style={s.metaK}>{k}</Text>
      <Text style={s.metaV}>{v}</Text>
    </View>
  );
}
function Tile({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={s.tile} onPress={onPress}>
      <Icon name={icon} size={26} color={C.ink2} />
      <Text style={s.tileL}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  eew: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.rojo, borderRadius: 14, padding: 14, marginBottom: 14 },
  eewT: { color: "#fff", fontWeight: "800", fontSize: 15 },
  eewS: { color: "#fff", opacity: 0.92, fontSize: 11.5, marginTop: 1 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 15, marginBottom: 12 },
  bold: { fontWeight: "700", color: C.ink },
  hint: { fontSize: 11.5, color: C.muted },
  sec: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, color: C.muted, marginTop: 8, marginBottom: 10 },
  sismo: { backgroundColor: C.slate, borderRadius: 14, padding: 16 },
  sHdr: { color: "#ff9a8f", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  mag: { color: "#fff", fontSize: 46, fontWeight: "900", lineHeight: 46 },
  magU: { color: "#fff", opacity: 0.85, fontSize: 13, paddingBottom: 6 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  metaK: { color: "#fff", opacity: 0.7, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  metaV: { color: "#fff", fontSize: 12, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "31.5%", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 10 },
  tileL: { fontSize: 11.5, fontWeight: "700", color: C.ink2, marginTop: 6, textAlign: "center" },
  aRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  aBorder: { borderTopWidth: 1, borderTopColor: C.line },
  aDot: { width: 10, height: 10, borderRadius: 5 },
  aTipo: { fontWeight: "700", fontSize: 13.5, color: C.ink },
  aMsg: { fontSize: 12, color: C.muted },
});
