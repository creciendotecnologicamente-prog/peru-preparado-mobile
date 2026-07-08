import { useEffect } from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Icon } from "../components/Icon";
import { PressableScale } from "../components/PressableScale";
import { Section } from "../components/Section";
import { IdeaGrowCredit } from "../components/IdeaGrow";
import { C } from "../theme";
import { haversineKm } from "../lib/geo";
import type { Quake } from "../lib/usgs";

export function Inicio({
  sismos, user, monitor, setMonitor, onSimular, onReportar, onSafe, onBuscar, alertas,
}: {
  sismos: Quake[];
  user: { lat: number; lon: number };
  monitor: boolean;
  setMonitor: (v: boolean) => void;
  onSimular: () => void;
  onReportar: () => void;
  onSafe: () => void;
  onBuscar: () => void;
  alertas: { id: string; tipo: string; msg: string; nivel: string }[];
}) {
  const u = sismos[0];
  return (
    <View>
      {/* Alerta Sísmica Temprana */}
      <PressableScale style={s.eew} onPress={onSimular} haptic="medium">
        <View style={s.eewIconWrap}>
          <PulseHalo />
          <Icon name="zap" size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eewT}>Alerta Sísmica Temprana</Text>
          <Text style={s.eewS}>Recibe el aviso ANTES del remezón · toca para ver un simulacro</Text>
        </View>
      </PressableScale>

      {/* Acciones de emergencia */}
      <Section icon="alert" title="Si acaba de temblar" hint="Avisa con un toque: tu familia y el sistema de búsqueda lo verán." />
      <View style={s.accRow}>
        <PressableScale style={[s.accBig, { backgroundColor: C.verde }]} onPress={onSafe} haptic="medium">
          <Icon name="check" size={24} color="#fff" />
          <Text style={s.accBigT}>Estoy a salvo</Text>
        </PressableScale>
        <PressableScale style={[s.accBig, { backgroundColor: C.rojo }]} onPress={onReportar} haptic="medium">
          <Icon name="alert" size={24} color="#fff" />
          <Text style={s.accBigT}>Reportar{"\n"}emergencia</Text>
        </PressableScale>
      </View>
      <PressableScale style={s.buscar} onPress={onBuscar}>
        <Icon name="search" size={18} color={C.azul} />
        <Text style={s.buscarT}>Buscar a una persona desaparecida</Text>
      </PressableScale>

      {/* Sismos en vivo */}
      <Section icon="activity" title="Sismos ahora" hint="Datos en vivo del IGP (fuente oficial del Perú) y USGS." tone="azul" />
      {u ? (
        <View style={s.sismo}>
          <Text style={s.sHdr}>Último sismo · fuente {u.fuente}</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 6 }}>
            <Text style={s.mag}>{u.mag}</Text>
            <Text style={s.magU}>magnitud</Text>
          </View>
          <View style={s.meta}>
            <Meta k="Profundidad" v={`${Math.round(u.depth)} km`} />
            <Meta k="A tu ubicación" v={`${Math.round(haversineKm(user.lat, user.lon, u.lat, u.lon))} km`} />
            <Meta k="Dónde" v={u.place} wide />
          </View>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.hint}>Cargando datos reales…</Text>
        </View>
      )}
      <View style={[s.card, { marginTop: 10 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <Switch value={monitor} onValueChange={setMonitor} trackColor={{ true: C.rojo }} />
          <View style={{ flex: 1 }}>
            <Text style={s.bold}>Vigilancia automática</Text>
            <Text style={s.hint}>Si se reporta un sismo fuerte (M ≥ 4.5), la app te alerta sola aunque estés en otra pantalla.</Text>
          </View>
        </View>
      </View>

      {/* Alertas activas */}
      <Section icon="broadcast" title="Alertas activas" hint="Los avisos que esta app disparó recientemente." tone="ambar" />
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

      <IdeaGrowCredit />
    </View>
  );
}

/** Anillo pulsante detrás del ícono del banner EEW: da sensación de "en vivo". */
function PulseHalo() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) })), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.value),
    transform: [{ scale: 1 + t.value * 0.9 }],
  }));
  return <Animated.View pointerEvents="none" style={[s.halo, style]} />;
}

function Meta({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <View style={{ width: wide ? "100%" : "48%" }}>
      <Text style={s.metaK}>{k}</Text>
      <Text style={s.metaV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  eew: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.rojo, borderRadius: 14, padding: 14 },
  eewIconWrap: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff" },
  eewT: { color: "#fff", fontWeight: "800", fontSize: 15 },
  eewS: { color: "#fff", opacity: 0.92, fontSize: 11.5, marginTop: 1 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 15 },
  bold: { fontWeight: "700", color: C.ink },
  hint: { fontSize: 11.5, color: C.muted, lineHeight: 16 },
  accRow: { flexDirection: "row", gap: 10 },
  accBig: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 20 },
  accBigT: { color: "#fff", fontSize: 14.5, fontWeight: "800", textAlign: "center", lineHeight: 19 },
  buscar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: C.azulSoft, borderWidth: 1.5, borderColor: "#cfe0f5", borderRadius: 12, paddingVertical: 13, marginTop: 10 },
  buscarT: { color: C.azul, fontSize: 13.5, fontWeight: "800" },
  sismo: { backgroundColor: C.slate, borderRadius: 14, padding: 16 },
  sHdr: { color: "#ff9a8f", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  mag: { color: "#fff", fontSize: 46, fontWeight: "900", lineHeight: 46 },
  magU: { color: "#fff", opacity: 0.85, fontSize: 13, paddingBottom: 6 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  metaK: { color: "#fff", opacity: 0.7, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  metaV: { color: "#fff", fontSize: 12, marginTop: 2 },
  aRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  aBorder: { borderTopWidth: 1, borderTopColor: C.line },
  aDot: { width: 10, height: 10, borderRadius: 5 },
  aTipo: { fontWeight: "700", fontSize: 13.5, color: C.ink },
  aMsg: { fontSize: 12, color: C.muted },
});
