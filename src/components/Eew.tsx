import { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Icon } from "./Icon";
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

  return (
    <Modal visible animationType="fade">
      <View style={[s.full, { backgroundColor: bg }]}>
        {fase === "aviso" && (
          <>
            <Text style={s.lead}>ALERTA SÍSMICA TEMPRANA</Text>
            <Text style={s.count}>{secs}</Text>
            <Text style={s.instr}>Segundos hasta el remezón{"\n"}ve a tu zona segura</Text>
            <Text style={s.ctx}>
              Sismo M {event.mag} · {event.place} · a {dist} km · intensidad {inten}
              {event.simulado ? " · (simulación)" : ""}
            </Text>
          </>
        )}
        {fase === "remezon" && (
          <>
            <Text style={s.lead}>REMEZÓN</Text>
            <Icon name="activity" size={120} color="#fff" />
            <Text style={s.instr}>¡AGÁCHATE, CÚBRETE{"\n"}Y SUJÉTATE!</Text>
            <Text style={s.ctx}>Protégete bajo una estructura resistente</Text>
          </>
        )}
        {fase === "fin" && (
          <>
            <Text style={s.lead}>El sismo terminó</Text>
            <Icon name="check" size={110} color="#fff" />
            <Text style={s.instr}>Evacúa con calma{"\n"}a la zona segura exterior</Text>
            <Text style={s.ctx}>¿Te encuentras bien?</Text>
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

const s = StyleSheet.create({
  full: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26 },
  lead: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 2, opacity: 0.92, textAlign: "center" },
  count: { color: "#fff", fontSize: 150, fontWeight: "900", lineHeight: 156, marginVertical: 6 },
  instr: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 10 },
  ctx: { color: "#fff", fontSize: 13, opacity: 0.85, textAlign: "center", marginTop: 18, maxWidth: 320 },
  avisar: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#1b8a4b", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, marginTop: 26 },
  avisarT: { color: "#fff", fontSize: 15, fontWeight: "800" },
  btn: { marginTop: 30, borderWidth: 2, borderColor: "rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 26 },
  btnTx: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
