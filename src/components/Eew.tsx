import { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Icon } from "./Icon";
import { ProgressRing } from "./ProgressRing";
import { haversineKm, secondsUntilShaking, intensidadAprox } from "../lib/geo";
import { C } from "../theme";

export interface EewEvent {
  mag: number;
  place: string;
  lat: number;
  lon: number;
  time: number;
  simulado?: boolean;
}
type Fase = "aviso" | "remezon" | "fin";

/**
 * Pantalla nativa de Alerta Sísmica Temprana. Calcula los segundos reales hasta
 * la onda S y avisa ANTES del remezón, con vibración háptica intensa y voz.
 * (Una alarma sonora con archivo de audio se añadirá con expo-audio.)
 */
export function Eew({
  event,
  user,
  onClose,
  onAvisar,
}: {
  event: EewEvent | null;
  user: { lat: number; lon: number };
  onClose: () => void;
  /** Avisar a la familia con mi ubicación (SMS + servidor). Se muestra al terminar el remezón. */
  onAvisar?: () => void | Promise<void>;
}) {
  const [fase, setFase] = useState<Fase>("aviso");
  const [secs, setSecs] = useState(0);
  const [total, setTotal] = useState(1); // segundos iniciales, para el anillo
  const [dist, setDist] = useState(0);
  const [inten, setInten] = useState("—");

  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const buzz = useRef<ReturnType<typeof setInterval> | null>(null);
  const finT = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearAll() {
    if (tick.current) clearInterval(tick.current);
    if (buzz.current) clearInterval(buzz.current);
    if (finT.current) clearTimeout(finT.current);
  }
  function say(t: string) {
    try {
      Speech.stop();
      Speech.speak(t, { language: "es-PE", rate: 1.05 });
    } catch {}
  }
  function impact() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  }

  useEffect(() => {
    if (!event) return;
    const d = haversineKm(user.lat, user.lon, event.lat, event.lon);
    const left = Math.round(secondsUntilShaking(d, event.time));
    setDist(Math.round(d));
    setInten(intensidadAprox(event.mag, d));
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    if (left > 1) {
      setFase("aviso");
      setSecs(left);
      setTotal(left);
      say("Alerta sísmica. Sismo detectado. Tiene segundos para protegerse. Diríjase a la zona segura.");
      let s = left;
      tick.current = setInterval(() => {
        s -= 1;
        if (s > 0) {
          setSecs(s);
          impact();
        } else {
          if (tick.current) clearInterval(tick.current);
          remezon();
        }
      }, 1000);
    } else {
      remezon();
    }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  function remezon() {
    setFase("remezon");
    say("Protéjase. Agáchese, cúbrase y sujétese.");
    buzz.current = setInterval(impact, 350);
    finT.current = setTimeout(fin, 9000);
  }
  function fin() {
    if (buzz.current) clearInterval(buzz.current);
    setFase("fin");
    say("El sismo terminó. Evacúe con calma. ¿Se encuentra bien?");
  }
  function close() {
    clearAll();
    try {
      Speech.stop();
    } catch {}
    onClose();
  }

  if (!event) return null;
  const bg = fase === "aviso" ? "#a51a0f" : fase === "remezon" ? "#0a0c11" : C.slate;
  const urgente = secs <= 10;

  return (
    <Modal visible animationType="fade">
      <View style={[s.full, { backgroundColor: bg }]}>
        {fase === "aviso" && (
          <>
            <LiveBadge text="ALERTA SÍSMICA TEMPRANA" />
            <View style={{ marginVertical: 26 }}>
              <ProgressRing
                pct={(secs / total) * 100}
                size={250}
                strokeWidth={11}
                color={urgente ? "#ffd21f" : "#ffffff"}
                track="rgba(255,255,255,0.22)"
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={[s.count, urgente && { color: "#ffd21f" }]}>{secs}</Text>
                  <Text style={s.countU}>segundos</Text>
                </View>
              </ProgressRing>
            </View>
            <Text style={s.instr}>Ve a tu zona segura{"\n"}AHORA</Text>
            <View style={s.chips}>
              <Chip text={`M ${event.mag}`} strong />
              <Chip text={`a ${dist} km`} />
              <Chip text={`intensidad ${inten}`} />
              {event.simulado && <Chip text="SIMULACRO" amber />}
            </View>
            <Text style={s.ctx}>{event.place}</Text>
          </>
        )}
        {fase === "remezon" && (
          <>
            <LiveBadge text="REMEZÓN EN CURSO" />
            <ShakeIcon />
            <Text style={s.instrBig}>¡AGÁCHATE,{"\n"}CÚBRETE{"\n"}Y SUJÉTATE!</Text>
            <Text style={s.ctx}>Protégete bajo una estructura resistente. No corras, no uses ascensores.</Text>
          </>
        )}
        {fase === "fin" && (
          <>
            <Text style={s.lead}>El sismo terminó</Text>
            <View style={s.finIcon}>
              <Icon name="check" size={64} color="#fff" />
            </View>
            <Text style={s.instr}>Evacúa con calma{"\n"}a la zona segura exterior</Text>
            <Text style={s.ctx}>¿Te encuentras bien? Avisa a los tuyos:</Text>
            {onAvisar && (
              <Pressable
                style={s.avisar}
                onPress={async () => {
                  try {
                    await onAvisar();
                  } catch {}
                  close();
                }}
              >
                <Icon name="pin" size={19} color="#fff" />
                <Text style={s.avisarT}>Enviar mi ubicación a mi familia</Text>
              </Pressable>
            )}
          </>
        )}
        <Pressable style={s.btn} onPress={close}>
          <Text style={s.btnTx}>Cerrar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** Badge superior con punto pulsante: "esto está pasando AHORA". */
function LiveBadge({ text }: { text: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1, false);
  }, []);
  const dot = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * t.value }));
  return (
    <View style={s.badge}>
      <Animated.View style={[s.badgeDot, dot]} />
      <Text style={s.badgeT}>{text}</Text>
    </View>
  );
}

/** Ícono de actividad sísmica que tiembla de verdad durante el remezón. */
function ShakeIcon() {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 60, easing: Easing.linear }),
        withTiming(7, { duration: 60, easing: Easing.linear }),
        withTiming(-4, { duration: 55, easing: Easing.linear }),
        withTiming(4, { duration: 55, easing: Easing.linear }),
      ),
      -1,
      true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[s.shakeWrap, style]}>
      <Icon name="activity" size={92} color="#fff" />
    </Animated.View>
  );
}

function Chip({ text, strong, amber }: { text: string; strong?: boolean; amber?: boolean }) {
  return (
    <View style={[s.chip, strong && s.chipStrong, amber && s.chipAmber]}>
      <Text style={[s.chipT, amber && { color: "#3d2c00" }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26 },
  badge: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  badgeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ffd21f" },
  badgeT: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },
  lead: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 2, opacity: 0.92, textAlign: "center" },
  count: { color: "#fff", fontSize: 88, fontWeight: "900", lineHeight: 92 },
  countU: { color: "#fff", opacity: 0.8, fontSize: 14, fontWeight: "700", marginTop: -4 },
  instr: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 8, lineHeight: 31 },
  instrBig: { color: "#fff", fontSize: 34, fontWeight: "900", textAlign: "center", marginTop: 18, lineHeight: 42 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 18 },
  chip: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 13 },
  chipStrong: { backgroundColor: "rgba(255,255,255,0.3)" },
  chipAmber: { backgroundColor: "#ffd21f" },
  chipT: { color: "#fff", fontSize: 12.5, fontWeight: "800" },
  ctx: { color: "#fff", fontSize: 13, opacity: 0.85, textAlign: "center", marginTop: 14, maxWidth: 320, lineHeight: 19 },
  shakeWrap: { marginTop: 26, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 90, padding: 34 },
  finIcon: { marginVertical: 22, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 70, padding: 28 },
  avisar: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#1b8a4b", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, marginTop: 22 },
  avisarT: { color: "#fff", fontSize: 15, fontWeight: "800" },
  btn: { marginTop: 26, borderWidth: 2, borderColor: "rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 26 },
  btnTx: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
