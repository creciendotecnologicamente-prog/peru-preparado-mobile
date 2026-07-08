import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Icon } from "../components/Icon";
import { Pulso } from "../components/Marca";
import { PressableScale } from "../components/PressableScale";
import { Section } from "../components/Section";
import { IdeaGrowCredit } from "../components/IdeaGrow";
import { C } from "../theme";
import { haversineKm } from "../lib/geo";
import type { Quake } from "../lib/usgs";
import type { AlertaActiva, EstadoSalvo } from "../../App";

export function Inicio({
  sismos, user, alerta, salvo, onAvisarSalvo, onTerminarAlerta, monitor, setMonitor, onAbrirCentro,
}: {
  sismos: Quake[];
  user: { lat: number; lon: number };
  alerta: AlertaActiva | null;
  salvo: EstadoSalvo;
  onAvisarSalvo: () => void;
  onTerminarAlerta: () => void;
  monitor: boolean;
  setMonitor: (v: boolean) => void;
  onAbrirCentro: () => void;
}) {
  const u = sismos[0];

  return (
    <View>
      {/* ── MODO EMERGENCIA: solo cuando hay una alerta activa ────────── */}
      {alerta ? (
        <Emergencia alerta={alerta} salvo={salvo} onAvisarSalvo={onAvisarSalvo} onTerminarAlerta={onTerminarAlerta} onAbrirCentro={onAbrirCentro} />
      ) : (
        <EnCalma u={u} user={user} monitor={monitor} setMonitor={setMonitor} />
      )}
    </View>
  );
}

/* ══════════════════════ ESTADO NORMAL: "EN CALMA" ══════════════════════ */
function EnCalma({
  u, user, monitor, setMonitor,
}: {
  u?: Quake;
  user: { lat: number; lon: number };
  monitor: boolean;
  setMonitor: (v: boolean) => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      {/* Tarjeta de estado tranquilizadora */}
      <View style={s.estadoCard}>
        <Pulso size={54} color="#fff" animado />
        <Text style={s.estadoT}>Todo en calma</Text>
        <Text style={s.estadoS}>
          No hay alertas activas. Perú Preparado vigila los sismos por ti y te avisará al instante si ocurre uno cerca.
        </Text>
        <View style={s.vigilaRow}>
          <View style={[s.vigilaDot, { backgroundColor: monitor ? "#5fd08a" : "rgba(255,255,255,0.5)" }]} />
          <Text style={s.vigilaT}>{monitor ? "Vigilancia activa" : "Vigilancia en pausa"}</Text>
          <PressableScale style={s.vigilaBtn} onPress={() => setMonitor(!monitor)}>
            <Text style={s.vigilaBtnT}>{monitor ? "Pausar" : "Activar"}</Text>
          </PressableScale>
        </View>
      </View>

      {/* Actividad sísmica reciente */}
      <Section icon="activity" title="Actividad sísmica" hint="En vivo, del IGP y USGS." tone="azul" />
      {u ? (
        <View style={s.ultimo}>
          <View style={s.ultimoMag}>
            <Text style={s.ultimoMagN}>{u.mag.toFixed(1)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ultimoLugar} numberOfLines={2}>{u.place}</Text>
            <Text style={s.ultimoMeta}>
              {relTime(u.time)} · a {Math.round(haversineKm(user.lat, user.lon, u.lat, u.lon))} km de ti · {u.fuente}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.card}><Text style={s.muted}>Cargando datos reales…</Text></View>
      )}
      <Text style={s.pieHint}>Encuentra el detalle completo y los filtros en la pestaña Mapa.</Text>

      {/* Cómo te protege la app — antes / durante / después */}
      <Section icon="info" title="Cómo te protege" hint="Qué hace Perú Preparado en cada momento." tone="verde" />
      <View style={s.card}>
        <Fase
          n="Antes"
          color={C.verde}
          items={["Vigila los sismos del IGP y USGS y te alerta al instante.", "Guarda tu ficha y la de tu familia para reconocerse.", "Te ayuda a preparar tu mochila y tu plan."]}
        />
        <Fase
          n="Durante"
          color={C.alerta}
          items={["Cuenta los segundos hasta el remezón y te guía a tu zona segura.", "Vibra y avisa por voz aunque el teléfono esté guardado."]}
          borde
        />
        <Fase
          n="Después"
          color={C.primario}
          items={["Con un toque avisas a tu familia que estás a salvo, con tu ubicación.", "Funciona sin internet: los mensajes viajan por QR de mano en mano."]}
          borde
        />
      </View>

      <IdeaGrowCredit />
    </Animated.View>
  );
}

/* ══════════════════════ MODO EMERGENCIA ══════════════════════ */
function Emergencia({
  alerta, salvo, onAvisarSalvo, onTerminarAlerta, onAbrirCentro,
}: {
  alerta: AlertaActiva;
  salvo: EstadoSalvo;
  onAvisarSalvo: () => void;
  onTerminarAlerta: () => void;
  onAbrirCentro: () => void;
}) {
  const { ev } = alerta;
  const enviado = typeof salvo === "object";
  const enviando = salvo === "enviando";

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      {/* Banner de alerta */}
      <View style={s.emgBanner}>
        <View style={s.emgTop}>
          <View style={s.emgPill}>
            <View style={s.emgPillDot} />
            <Text style={s.emgPillT}>ALERTA ACTIVA</Text>
          </View>
          {ev.simulado && <Text style={s.emgSim}>SIMULACRO</Text>}
        </View>
        <Text style={s.emgTitulo}>Sismo M {ev.mag}</Text>
        <Text style={s.emgLugar}>{ev.place}</Text>
      </View>

      {/* Acción principal: Estoy a salvo (solo existe durante la emergencia) */}
      <Section icon="check" title="Avisa que estás a salvo" hint="Tu familia recibe tu mensaje, tu ubicación y la hora exacta." tone="verde" />

      {enviado ? (
        <View style={s.salvoOk}>
          <View style={s.salvoOkIc}>
            <Icon name="check" size={30} color="#fff" />
          </View>
          <Text style={s.salvoOkT}>Aviso enviado</Text>
          <Text style={s.salvoOkS}>
            A las {salvo.hora}
            {salvo.conUbicacion ? " · con tu ubicación" : " · sin GPS disponible"}
          </Text>
          <PressableScale style={s.salvoAgain} onPress={onAvisarSalvo}>
            <Icon name="send" size={14} color={C.primario} />
            <Text style={s.salvoAgainT}>Enviar de nuevo</Text>
          </PressableScale>
        </View>
      ) : (
        <PressableScale style={[s.salvoBtn, enviando && { opacity: 0.7 }]} onPress={onAvisarSalvo} haptic="medium" disabled={enviando}>
          <Icon name="check" size={26} color="#fff" />
          <View>
            <Text style={s.salvoBtnT}>{enviando ? "Enviando…" : "Estoy a salvo"}</Text>
            <Text style={s.salvoBtnS}>{enviando ? "Obteniendo tu ubicación" : "Avisar a mi familia ahora"}</Text>
          </View>
        </PressableScale>
      )}

      {/* Accesos de emergencia */}
      <View style={s.emgGrid}>
        <PressableScale style={s.emgAccion} onPress={onAbrirCentro}>
          <View style={[s.emgAccionIc, { backgroundColor: C.primarioSoft }]}>
            <Icon name="broadcast" size={20} color={C.primario} />
          </View>
          <Text style={s.emgAccionT}>Centro de{"\n"}emergencia</Text>
        </PressableScale>
        <PressableScale style={s.emgAccion} onPress={onAbrirCentro}>
          <View style={[s.emgAccionIc, { backgroundColor: C.alertaSoft }]}>
            <Icon name="search" size={20} color={C.alerta} />
          </View>
          <Text style={s.emgAccionT}>Buscar a{"\n"}alguien</Text>
        </PressableScale>
      </View>

      <PressableScale style={s.terminar} onPress={onTerminarAlerta}>
        <Text style={s.terminarT}>Marcar la alerta como terminada</Text>
      </PressableScale>
    </Animated.View>
  );
}

/* ── auxiliares ── */
function Fase({ n, color, items, borde }: { n: string; color: string; items: string[]; borde?: boolean }) {
  return (
    <View style={[s.fase, borde && s.faseBorde]}>
      <View style={s.faseHead}>
        <View style={[s.faseChip, { backgroundColor: color }]}>
          <Text style={s.faseChipT}>{n}</Text>
        </View>
      </View>
      {items.map((it, i) => (
        <View key={i} style={s.faseItem}>
          <View style={[s.faseBullet, { backgroundColor: color }]} />
          <Text style={s.faseItemT}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

function relTime(t: number): string {
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16 },
  muted: { fontSize: 12, color: C.muted },
  pieHint: { fontSize: 11.5, color: C.muted, marginTop: 8, marginLeft: 2 },

  // Estado en calma
  estadoCard: { backgroundColor: C.marino, borderRadius: 20, padding: 22, alignItems: "center" },
  estadoT: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 12 },
  estadoS: { color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 6 },
  vigilaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignSelf: "stretch" },
  vigilaDot: { width: 9, height: 9, borderRadius: 5 },
  vigilaT: { color: "#fff", fontSize: 13, fontWeight: "700", flex: 1 },
  vigilaBtn: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 9, paddingVertical: 7, paddingHorizontal: 14 },
  vigilaBtnT: { color: "#fff", fontSize: 12.5, fontWeight: "800" },

  // Último sismo
  ultimo: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14 },
  ultimoMag: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.azulSoft, alignItems: "center", justifyContent: "center" },
  ultimoMagN: { fontSize: 20, fontWeight: "900", color: C.azul },
  ultimoLugar: { fontSize: 14.5, fontWeight: "800", color: C.ink },
  ultimoMeta: { fontSize: 12, color: C.muted, marginTop: 3 },

  // Fases
  fase: { paddingVertical: 12 },
  faseBorde: { borderTopWidth: 1, borderTopColor: C.line },
  faseHead: { marginBottom: 8 },
  faseChip: { alignSelf: "flex-start", borderRadius: 8, paddingVertical: 4, paddingHorizontal: 11 },
  faseChipT: { color: "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  faseItem: { flexDirection: "row", gap: 9, alignItems: "flex-start", paddingVertical: 4 },
  faseBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  faseItemT: { flex: 1, fontSize: 13, color: C.ink2, lineHeight: 19 },

  // Emergencia
  emgBanner: { backgroundColor: C.alerta, borderRadius: 20, padding: 20 },
  emgTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  emgPill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12 },
  emgPillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  emgPillT: { color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  emgSim: { color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1, opacity: 0.85 },
  emgTitulo: { color: "#fff", fontSize: 32, fontWeight: "900" },
  emgLugar: { color: "rgba(255,255,255,0.92)", fontSize: 14, marginTop: 2 },

  salvoBtn: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.verde, borderRadius: 18, padding: 20 },
  salvoBtnT: { color: "#fff", fontSize: 20, fontWeight: "900" },
  salvoBtnS: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 1 },
  salvoOk: { backgroundColor: C.verdeSoft, borderWidth: 1.5, borderColor: "#bfe6d0", borderRadius: 18, padding: 20, alignItems: "center" },
  salvoOkIc: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.verde, alignItems: "center", justifyContent: "center" },
  salvoOkT: { fontSize: 18, fontWeight: "900", color: C.verde, marginTop: 12 },
  salvoOkS: { fontSize: 13, color: C.ink2, marginTop: 3 },
  salvoAgain: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 16 },
  salvoAgainT: { color: C.primario, fontSize: 13, fontWeight: "800" },

  emgGrid: { flexDirection: "row", gap: 12, marginTop: 14 },
  emgAccion: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, alignItems: "center", gap: 9 },
  emgAccionIc: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  emgAccionT: { fontSize: 12.5, fontWeight: "800", color: C.ink, textAlign: "center", lineHeight: 16 },

  terminar: { alignItems: "center", paddingVertical: 16, marginTop: 6 },
  terminarT: { fontSize: 13, fontWeight: "700", color: C.muted, textDecorationLine: "underline" },
});
