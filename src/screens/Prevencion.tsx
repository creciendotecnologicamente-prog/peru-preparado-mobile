import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "../components/Icon";
import { FamilySync } from "../components/FamilySync";
import { PressableScale } from "../components/PressableScale";
import { ProgressRing } from "../components/ProgressRing";
import { C } from "../theme";
import { type Profile, preparedness, nivelPreparacion } from "../lib/profile";
import { loadFamily } from "../lib/family";

const PLAN = ["Punto de encuentro familiar", "Contacto fuera de la ciudad", "Saber cortar luz, agua y gas", "Conocer las zonas seguras", "Copia de documentos importantes"];
const KIT = ["Agua (1 galón por persona/día)", "Alimentos no perecibles (3 días)", "Botiquín de primeros auxilios", "Linterna, pilas y radio", "Silbato y copias de DNI"];
const GUIA: Record<string, string[]> = {
  antes: ["Asegura muebles altos y objetos pesados.", "Ten lista tu mochila de emergencia.", "Identifica zonas seguras y rutas."],
  durante: ["Mantén la calma; ve a la zona segura.", "En la costa, si es fuerte y largo, evacúa a terreno alto.", "No uses ascensores."],
  despues: ["Evacúa con calma al exterior.", "No enciendas fósforos (fuga de gas).", "Atiende indicaciones oficiales y reporta tu estado."],
};

const CHECKS_KEY = "pp_checks_v1";

export function Prevencion({ profile, onEdit }: { profile: Profile | null; onEdit: () => void }) {
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

  const pct = profile ? preparedness(profile) : 0;
  const nivel = nivelPreparacion(pct);

  const [sync, setSync] = useState(false);
  const [famCount, setFamCount] = useState(0);
  useEffect(() => {
    loadFamily().then((f) => setFamCount(f.length));
  }, [sync]);

  return (
    <View>
      {profile && (
        <>
          <Text style={s.sec}>Mi preparación</Text>
          <View style={s.scoreCard}>
            <ProgressRing pct={pct} size={64} strokeWidth={6} color={nivel.color}>
              <Text style={[s.ringN, { color: nivel.color }]}>{pct}%</Text>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <Text style={[s.nivel, { color: nivel.color }]}>{nivel.label}</Text>
              <Text style={s.nivelHint}>Según tu Test de Conocimiento</Text>
              <PressableScale style={s.editBtn} onPress={onEdit}>
                <Icon name="check" size={14} color={C.rojo} />
                <Text style={s.editT}>Editar mi ficha</Text>
              </PressableScale>
            </View>
          </View>

          <Text style={s.sec}>Mi ficha · sincronización familiar</Text>
          <View style={s.ficha}>
            <View style={s.fichaHead}>
              <View style={s.fichaAv}>
                <Icon name="users" size={20} color={C.rojo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fichaName}>{profile.nombre || "Sin nombre"}</Text>
                <Text style={s.fichaSub}>
                  DNI {profile.dni || "—"} · {profile.nacionalidad || "—"}
                </Text>
              </View>
            </View>
            {profile.region ? <FRow k="Hogar" v={`${profile.region}${profile.vivienda ? " · " + profile.vivienda : ""}`} /> : null}
            {profile.miembros ? <FRow k="Familia" v={`${profile.miembros} persona(s)${profile.vulnerables.length ? " · " + profile.vulnerables.length + " vulnerable(s)" : ""}`} /> : null}
            {profile.contactoNombre ? <FRow k="Contacto" v={`${profile.contactoNombre} · ${profile.contactoTel || "—"}`} /> : null}
            {profile.mensaje ? <FRow k="Mensaje" v={`“${profile.mensaje}”`} /> : null}
            <View style={s.bt}>
              <Icon name="broadcast" size={15} color={C.azul} />
              <Text style={s.btT}>Tu familia te reconoce con esta ficha. Sincronízala por QR, sin internet.</Text>
            </View>
            <PressableScale style={s.syncBtn} onPress={() => setSync(true)} haptic="medium">
              <Icon name="users" size={17} color="#fff" />
              <Text style={s.syncT}>Sincronizar con mi familia{famCount ? ` · ${famCount}` : ""}</Text>
            </PressableScale>
          </View>
        </>
      )}

      <Text style={s.sec}>Prepárate antes del desastre</Text>
      <Lista titulo="Mi plan familiar" icon="users" items={PLAN} prefix="p" done={done} toggle={toggle} />
      <Lista titulo="Mochila de emergencia" icon="kit" items={KIT} prefix="k" done={done} toggle={toggle} />

      <View style={s.card}>
        <View style={s.ah}>
          <Icon name="activity" size={19} color={C.ink2} />
          <Text style={s.ahT}>¿Qué hacer ante un sismo?</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
          {["antes", "durante", "despues"].map((f) => (
            <PressableScale key={f} style={[s.gtab, fase === f && s.gtabOn]} onPress={() => setFase(f)}>
              <Text style={[s.gtabT, fase === f && { color: "#fff" }]}>{f[0].toUpperCase() + f.slice(1)}</Text>
            </PressableScale>
          ))}
        </View>
        {GUIA[fase].map((x, i) => (
          <Text key={i} style={s.gli}>
            •  {x}
          </Text>
        ))}
      </View>

      {profile && <FamilySync profile={profile} visible={sync} onClose={() => setSync(false)} />}
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

function FRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.fRow}>
      <Text style={s.fK}>{k}</Text>
      <Text style={s.fV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  sec: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, color: C.muted, marginTop: 8, marginBottom: 10 },
  scoreCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 15, marginBottom: 12 },
  ringN: { fontSize: 17, fontWeight: "900" },
  nivel: { fontSize: 16, fontWeight: "800" },
  nivelHint: { fontSize: 12, color: C.muted, marginTop: 1 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 9, alignSelf: "flex-start", borderWidth: 1.5, borderColor: C.line, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 11 },
  editT: { fontSize: 12.5, fontWeight: "700", color: C.rojo },
  ficha: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 15, marginBottom: 10 },
  fichaHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  fichaAv: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.rojoSoft, alignItems: "center", justifyContent: "center" },
  fichaName: { fontSize: 16, fontWeight: "800", color: C.ink },
  fichaSub: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  fRow: { flexDirection: "row", gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.line },
  fK: { width: 70, fontSize: 11, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.3, paddingTop: 1 },
  fV: { flex: 1, fontSize: 13, color: C.ink2 },
  bt: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 12, backgroundColor: C.azulSoft, borderRadius: 9, padding: 10 },
  btT: { flex: 1, fontSize: 11.5, color: C.azul, fontWeight: "600" },
  syncBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.rojo, borderRadius: 11, paddingVertical: 13, marginTop: 11 },
  syncT: { color: "#fff", fontSize: 14.5, fontWeight: "800" },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, marginBottom: 10 },
  ah: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  ahT: { fontWeight: "700", fontSize: 14, color: C.ink },
  pct: { marginLeft: "auto", fontWeight: "800", color: C.verde, fontSize: 12 },
  bar: { height: 5, borderRadius: 3, backgroundColor: C.line, overflow: "hidden", marginBottom: 8 },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: C.verde },
  chk: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: C.verde, borderColor: C.verde },
  chkT: { flex: 1, fontSize: 13.5, color: C.ink2 },
  gtab: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: C.line, alignItems: "center" },
  gtabOn: { backgroundColor: C.rojo, borderColor: C.rojo },
  gtabT: { fontSize: 12.5, fontWeight: "700", color: C.muted },
  gli: { fontSize: 13.5, color: C.ink2, marginBottom: 6, lineHeight: 20 },
});
