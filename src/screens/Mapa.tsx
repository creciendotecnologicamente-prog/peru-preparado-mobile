import { useMemo, useState } from "react";
import { View, Text, Linking, StyleSheet } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Icon } from "../components/Icon";
import { PressableScale } from "../components/PressableScale";
import { Section } from "../components/Section";
import { C } from "../theme";
import { haversineKm } from "../lib/geo";
import { mapsUrl } from "../lib/ubicacion";
import { LUGARES, TIPO_INFO, type TipoLugar, type Lugar } from "../lib/lugares";

type Filtro = "todos" | TipoLugar;

export function Mapa({ user, geoOk, onUbicar }: { user: { lat: number; lon: number }; geoOk: boolean; onUbicar: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const conDist = useMemo(
    () =>
      LUGARES.map((l) => ({ ...l, dist: haversineKm(user.lat, user.lon, l.lat, l.lon) })).sort((a, b) => a.dist - b.dist),
    [user.lat, user.lon],
  );

  const lista = filtro === "todos" ? conDist : conDist.filter((l) => l.tipo === filtro);
  const masCercana = conDist.find((l) => l.tipo === "zona");

  return (
    <View>
      {/* Radar: la zona segura más cercana, protagonista */}
      <View style={s.radarCard}>
        <Radar lugares={conDist.slice(0, 7)} user={user} />
        <Text style={s.radarLead}>Tu zona segura más cercana</Text>
        {masCercana ? (
          <>
            <Text style={s.radarNombre}>{masCercana.nombre}</Text>
            <Text style={s.radarMeta}>{masCercana.zona} · a {fmtDist(masCercana.dist)}</Text>
            <PressableScale style={s.radarBtn} haptic="medium" onPress={() => Linking.openURL(mapsUrl(masCercana.lat, masCercana.lon))}>
              <Icon name="map" size={17} color="#fff" />
              <Text style={s.radarBtnT}>Cómo llegar</Text>
            </PressableScale>
          </>
        ) : (
          <Text style={s.radarMeta}>Sin datos</Text>
        )}
      </View>

      {!geoOk && (
        <PressableScale style={s.ubicar} onPress={onUbicar}>
          <Icon name="pin" size={16} color={C.primario} />
          <Text style={s.ubicarT}>Usar mi ubicación real para ordenar por distancia</Text>
        </PressableScale>
      )}

      {/* Filtros por tipo */}
      <Section icon="map" title="Puntos de referencia" hint="Ordenados por cercanía a ti. Toca “Ir” para abrir la ruta." tone="azul" />
      <View style={s.filtros}>
        <Chip activo={filtro === "todos"} onPress={() => setFiltro("todos")} label="Todos" color={C.primario} />
        {(Object.keys(TIPO_INFO) as TipoLugar[]).map((t) => (
          <Chip key={t} activo={filtro === t} onPress={() => setFiltro(t)} label={TIPO_INFO[t].plural} color={TIPO_INFO[t].color} />
        ))}
      </View>

      <View style={s.card}>
        {lista.map((l, i) => (
          <LugarRow key={l.id} lugar={l} dist={l.dist} borde={i > 0} />
        ))}
      </View>

      <View style={s.nota}>
        <Icon name="info" size={15} color={C.muted} />
        <Text style={s.notaT}>
          Puntos de referencia basados en zonas amplias, hospitales y albergues de Lima. Verifica siempre las rutas oficiales de tu distrito (INDECI).
        </Text>
      </View>
    </View>
  );
}

function LugarRow({ lugar, dist, borde }: { lugar: Lugar; dist: number; borde: boolean }) {
  const info = TIPO_INFO[lugar.tipo];
  return (
    <View style={[s.row, borde && s.rowBorde]}>
      <View style={[s.rowIc, { backgroundColor: info.color + "1A" }]}>
        <Icon name={info.icon} size={19} color={info.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowNombre} numberOfLines={1}>{lugar.nombre}</Text>
        <Text style={s.rowMeta}>{info.label} · {lugar.zona} · {fmtDist(dist)}</Text>
      </View>
      <PressableScale style={s.rowBtn} haptic="light" onPress={() => Linking.openURL(mapsUrl(lugar.lat, lugar.lon))}>
        <Icon name="map" size={14} color={C.primario} />
        <Text style={s.rowBtnT}>Ir</Text>
      </PressableScale>
    </View>
  );
}

/** Radar estilizado: tú al centro, los lugares por dirección real y cercanía. */
function Radar({ lugares, user }: { lugares: (Lugar & { dist: number })[]; user: { lat: number; lon: number } }) {
  const R = 78;
  const cx = 90;
  const cy = 90;
  const maxD = Math.max(0.5, ...lugares.map((l) => l.dist));
  return (
    <Svg width={180} height={180} viewBox="0 0 180 180">
      {[1, 0.66, 0.33].map((f, i) => (
        <Circle key={i} cx={cx} cy={cy} r={R * f} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
      ))}
      <Line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <Line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {lugares.map((l) => {
        // Dirección relativa a TU posición (norte arriba, este a la derecha).
        const dLat = l.lat - user.lat;
        const dLon = (l.lon - user.lon) * Math.cos((user.lat * Math.PI) / 180);
        const ang = Math.atan2(dLon, dLat); // 0 = norte
        const r = R * (0.3 + 0.65 * (l.dist / maxD));
        const px = cx + r * Math.sin(ang);
        const py = cy - r * Math.cos(ang);
        return <Circle key={l.id} cx={px} cy={py} r={4.5} fill={TIPO_INFO[l.tipo].color} stroke="#fff" strokeWidth="1.2" />;
      })}
      <Circle cx={cx} cy={cy} r={6.5} fill="#fff" />
    </Svg>
  );
}

function Chip({ activo, onPress, label, color }: { activo: boolean; onPress: () => void; label: string; color: string }) {
  return (
    <PressableScale style={[s.chip, activo && { backgroundColor: color, borderColor: color }]} onPress={onPress}>
      <Text style={[s.chipT, activo && { color: "#fff" }]}>{label}</Text>
    </PressableScale>
  );
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 6, overflow: "hidden" },

  radarCard: { backgroundColor: C.marino, borderRadius: 20, padding: 20, alignItems: "center" },
  radarLead: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 6 },
  radarNombre: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 6, textAlign: "center" },
  radarMeta: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 3 },
  radarBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primario, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 22, marginTop: 16 },
  radarBtnT: { color: "#fff", fontSize: 15, fontWeight: "800" },

  ubicar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primarioSoft, borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  ubicarT: { color: C.primario, fontSize: 12.5, fontWeight: "800" },

  filtros: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 },
  chip: { borderWidth: 1.5, borderColor: C.line, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: C.surface },
  chipT: { fontSize: 12, fontWeight: "700", color: C.ink2 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 11 },
  rowBorde: { borderTopWidth: 1, borderTopColor: C.line },
  rowIc: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowNombre: { fontSize: 14.5, fontWeight: "800", color: C.ink },
  rowMeta: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  rowBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.primarioSoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  rowBtnT: { color: C.primario, fontSize: 13, fontWeight: "800" },

  nota: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 12, paddingHorizontal: 4 },
  notaT: { flex: 1, fontSize: 11, color: C.muted, lineHeight: 16 },
});
