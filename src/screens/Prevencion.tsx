import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "../components/Icon";
import { PressableScale } from "../components/PressableScale";
import { Section } from "../components/Section";
import { C } from "../theme";
import type { Profile } from "../lib/profile";

const PLAN = ["Punto de encuentro familiar", "Contacto fuera de la ciudad", "Saber cortar luz, agua y gas", "Conocer las zonas seguras", "Copia de documentos importantes"];
const KIT = ["Agua (1 galón por persona/día)", "Alimentos no perecibles (3 días)", "Botiquín de primeros auxilios", "Linterna, pilas y radio", "Silbato y copias de DNI"];
const GUIA: Record<string, string[]> = {
  antes: ["Asegura muebles altos y objetos pesados.", "Ten lista tu mochila de emergencia.", "Identifica zonas seguras y rutas."],
  durante: ["Mantén la calma; ve a la zona segura.", "En la costa, si es fuerte y largo, evacúa a terreno alto.", "No uses ascensores."],
  despues: ["Evacúa con calma al exterior.", "No enciendas fósforos (fuga de gas).", "Atiende indicaciones oficiales y reporta tu estado."],
};

const CHECKS_KEY = "pp_checks_v1";

export function Prevencion({ profile, onSimular }: { profile: Profile | null; onSimular: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [fase, setFase] = useState("antes");

  useEffect(() => {
    AsyncStorage.getItem(CHECKS_KEY)
      .then((raw) => raw && setDone(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const toggle = (id: string) =>
    setDone((d) => {
      const next = { ...d, [id]: !d[id] };
      AsyncStorage.setItem(CHECKS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  return (
    <View>
      {/* Simulacro: practicar ES preparación (por eso vive aquí, no en la alerta real) */}
      <View style={s.simCard}>
        <View style={s.simIc}>
          <Icon name="zap" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.simT}>Practica un simulacro</Text>
          <Text style={s.simS}>Vive la alerta sísmica temprana de principio a fin, sin riesgo.</Text>
        </View>
        <PressableScale style={s.simBtn} onPress={onSimular} haptic="medium">
          <Text style={s.simBtnT}>Iniciar</Text>
        </PressableScale>
      </View>

      {/* Listas de verificación */}
      <Section icon="kit" title="Tus listas de preparación" hint="Marca lo que ya tienes listo. Se guarda en tu teléfono." tone="ambar" />
      <Lista titulo="Mi plan familiar" icon="users" items={PLAN} prefix="p" done={done} toggle={toggle} />
      <Lista titulo="Mochila de emergencia" icon="kit" items={KIT} prefix="k" done={done} toggle={toggle} />

      {/* Guía qué hacer */}
      <Section icon="info" title="¿Qué hacer ante un sismo?" hint="Los pasos clave, antes, durante y después." tone="verde" />
      <View style={s.card}>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
          {["antes", "durante", "despues"].map((f) => (
            <PressableScale key={f} style={[s.gtab, fase === f && s.gtabOn]} onPress={() => setFase(f)}>
              <Text style={[s.gtabT, fase === f && { color: "#fff" }]}>{f[0].toUpperCase() + f.slice(1)}</Text>
            </PressableScale>
          ))}
        </View>
        {GUIA[fase].map((x, i) => (
          <View key={i} style={s.gliRow}>
            <View style={s.gliDot} />
            <Text style={s.gli}>{x}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Lista({ titulo, icon, items, prefix, done, toggle }: { titulo: string; icon: string; items: string[]; prefix: string; done: Record<string, boolean>; toggle: (id: string) => void }) {
  const total = items.length;
  const d = items.filter((_, i) => done[prefix + i]).length;
  const pct = Math.round((d / total) * 100);
  return (
    <View style={s.card}>
      <View style={s.ah}>
        <Icon name={icon} size={19} color={C.ink2} />
        <Text style={s.ahT}>{titulo}</Text>
        <Text style={s.pct}>{pct}%</Text>
      </View>
      <View style={s.bar}>
        <View style={[s.barFill, { width: `${pct}%` }]} />
      </View>
      {items.map((it, i) => {
        const on = !!done[prefix + i];
        return (
          <PressableScale key={i} style={s.chk} onPress={() => toggle(prefix + i)} haptic={on ? "light" : "success"}>
            <View style={[s.box, on && s.boxOn]}>{on && <Icon name="check" size={13} color="#fff" />}</View>
            <Text style={[s.chkT, on && { textDecorationLine: "line-through", color: C.muted }]}>{it}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, marginBottom: 10 },

  simCard: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: C.marino, borderRadius: 18, padding: 16 },
  simIc: { width: 44, height: 44, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  simT: { color: "#fff", fontSize: 15.5, fontWeight: "900" },
  simS: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  simBtn: { backgroundColor: "#fff", borderRadius: 11, paddingVertical: 10, paddingHorizontal: 16 },
  simBtnT: { color: C.marino, fontSize: 13.5, fontWeight: "900" },

  ah: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  ahT: { fontWeight: "800", fontSize: 14.5, color: C.ink },
  pct: { marginLeft: "auto", fontWeight: "900", color: C.verde, fontSize: 13 },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.surface2, overflow: "hidden", marginBottom: 10 },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: C.verde },
  chk: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: C.verde, borderColor: C.verde },
  chkT: { flex: 1, fontSize: 14, color: C.ink2 },

  gtab: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, alignItems: "center" },
  gtabOn: { backgroundColor: C.primario, borderColor: C.primario },
  gtabT: { fontSize: 12.5, fontWeight: "800", color: C.muted },
  gliRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 5 },
  gliDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primario, marginTop: 7 },
  gli: { flex: 1, fontSize: 14, color: C.ink2, lineHeight: 20 },
});
