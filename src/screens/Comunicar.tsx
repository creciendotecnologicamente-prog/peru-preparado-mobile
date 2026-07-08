import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Alert, Modal, ScrollView, Linking, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Icon } from "../components/Icon";
import { PressableScale } from "../components/PressableScale";
import { Section } from "../components/Section";
import { RedMalla } from "../components/RedMalla";
import { useToast } from "../components/Toast";
import { C } from "../theme";
import type { Profile } from "../lib/profile";
import {
  loadServer,
  listarPersonas,
  crearPersona,
  marcarEncontrado,
  enviarReporte,
  REGIONES,
  type Persona,
  type PersonaNueva,
} from "../lib/server";

const dniValido = (d?: string) => !!d && /^\d{8}$/.test(d);

export function Comunicar({ profile, onBack }: { profile?: Profile | null; onBack?: () => void }) {
  const toast = useToast();
  const [server, setServer] = useState("");
  const [ubic, setUbic] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Buscador en vivo contra la API
  const [q, setQ] = useState("");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [sinServer, setSinServer] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    loadServer().then(setServer);
  }, []);

  const buscar = useCallback(
    async (base: string, query: string) => {
      if (!base) {
        setSinServer(true);
        return;
      }
      setBuscando(true);
      try {
        setPersonas(await listarPersonas(base, query));
        setSinServer(false);
      } catch {
        setSinServer(true);
      } finally {
        setBuscando(false);
      }
    },
    [],
  );

  // Primera carga + búsqueda con debounce al escribir.
  useEffect(() => {
    if (!server) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => buscar(server, q), 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [server, q, buscar]);

  async function reportarEmergencia() {
    if (!ubic.trim()) return;
    setEnviando(true);
    try {
      await enviarReporte(server, {
        tipo: "emergencia",
        ubicacion: ubic.trim(),
        nombre: profile?.nombre || undefined,
        ...(dniValido(profile?.dni) ? { dni: profile!.dni } : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("success", "Reporte enviado al COE.");
      setUbic("");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("No se pudo enviar", `${e?.message ?? "Error"}. Sin internet, usa el Chat de emergencia más abajo.`);
    } finally {
      setEnviando(false);
    }
  }

  function confirmarEncontrado(p: Persona) {
    Alert.alert("Marcar encontrado", `¿Confirmas que ${p.nombre} ${p.apellido} fue encontrado(a)?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, confirmar",
        onPress: async () => {
          try {
            await marcarEncontrado(server, p.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            toast("success", `${p.nombre} ${p.apellido} marcado(a) como encontrado(a).`);
            buscar(server, q);
          } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", e?.message ?? "No se pudo actualizar");
          }
        },
      },
    ]);
  }

  return (
    <View>
      {onBack && (
        <PressableScale style={s.back} onPress={onBack}>
          <Text style={s.backChevron}>‹</Text>
          <Text style={s.backT}>Volver</Text>
          <Text style={s.backTitulo}>Centro de emergencia</Text>
        </PressableScale>
      )}

      <Section icon="alert" title="Reportar emergencia" hint="Con ubicación y detalle, llega directo al centro de operaciones (COE)." tone="rojo" />
      <View style={s.card}>
        <Text style={s.label}>¿Qué pasa y dónde?</Text>
        <TextInput style={s.input} placeholder="Ubicación o referencia" value={ubic} onChangeText={setUbic} placeholderTextColor={C.muted} />
        <PressableScale style={[s.btn, { backgroundColor: C.rojo, opacity: enviando ? 0.6 : 1 }]} disabled={enviando} onPress={reportarEmergencia} haptic="medium">
          <Icon name="alert" size={18} color="#fff" />
          <Text style={s.btnTx}>Enviar reporte al COE</Text>
        </PressableScale>
        <Text style={s.miniHint}>¿Solo quieres avisar que estás bien? Usa “Estoy a salvo” en Inicio.</Text>
      </View>

      <Section icon="search" title="Personas desaparecidas" hint="Busca por nombre o DNI en el registro compartido con la web Perú Te Busca." tone="azul" />
      <View style={s.card}>
        <TextInput style={s.input} placeholder="Nombre, apellido o DNI…" value={q} onChangeText={setQ} placeholderTextColor={C.muted} />
        {sinServer || !server ? (
          <Text style={s.hint}>Sin conexión al servidor. Revisa tu internet e inténtalo de nuevo.</Text>
        ) : buscando && personas.length === 0 ? (
          <Text style={s.hint}>Buscando…</Text>
        ) : personas.length === 0 ? (
          <Text style={s.hint}>Sin coincidencias.</Text>
        ) : (
          personas.map((p) => (
            <View key={p.id} style={s.pRow}>
              <View style={[s.pDot, { backgroundColor: p.estado === "buscado" ? C.rojo : C.verde }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.pName}>
                  {p.nombre} {p.apellido}
                </Text>
                <Text style={s.pSub}>
                  DNI {p.dni}{p.dniVerificado ? " ✓" : ""} · {p.lugar}, {p.region}
                </Text>
                {p.estado === "buscado" && (
                  <Pressable onPress={() => confirmarEncontrado(p)} hitSlop={6}>
                    <Text style={s.pAct}>✓ Marcar encontrado</Text>
                  </Pressable>
                )}
              </View>
              <Text style={[s.pBadge, { color: p.estado === "buscado" ? C.rojo : C.verde, backgroundColor: p.estado === "buscado" ? C.rojoSoft : C.verdeSoft }]}>
                {p.estado === "buscado" ? "BUSCADO" : "HALLADO"}
              </Text>
            </View>
          ))
        )}
        <PressableScale style={[s.btn, { backgroundColor: C.azul, marginTop: 11 }]} onPress={() => setFormVisible(true)}>
          <Icon name="search" size={17} color="#fff" />
          <Text style={s.btnTx}>Reportar persona desaparecida</Text>
        </PressableScale>
      </View>

      <Section icon="broadcast" title="Chat de emergencia" hint="Se conecta solo. Sin internet, tus mensajes viajan de teléfono en teléfono por QR." tone="verde" />
      <RedMalla profile={profile} />

      <Section icon="phone" title="Líneas de emergencia" hint="Gratuitas, 24 horas. Toca una y tu teléfono marca solo." tone="rojo" />
      <View style={s.telGrid}>
        {([["105", "Policía"], ["116", "Bomberos"], ["106", "SAMU"], ["115", "INDECI"]] as [string, string][]).map(([num, lbl]) => (
          <PressableScale key={num} style={s.tel} haptic="medium" onPress={() => Linking.openURL("tel:" + num)}>
            <Text style={s.telNum}>{num}</Text>
            <Text style={s.telLbl}>{lbl}</Text>
          </PressableScale>
        ))}
      </View>

      <FormPersona
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        server={server}
        profile={profile}
        onCreada={() => {
          setFormVisible(false);
          buscar(server, q);
        }}
      />
    </View>
  );
}

/* ---------- Formulario de persona desaparecida ---------- */
function FormPersona({
  visible, onClose, server, profile, onCreada,
}: {
  visible: boolean;
  onClose: () => void;
  server: string;
  profile?: Profile | null;
  onCreada: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState<PersonaNueva>({
    nombre: "", apellido: "", dni: "", region: profile?.region && REGIONES.includes(profile.region) ? profile.region : "Lima",
    lugar: "", desc: "", rep: profile?.nombre ?? "", tel: profile?.contactoTel ?? "",
  });
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof PersonaNueva) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function enviar() {
    if (!f.nombre.trim() || !f.apellido.trim()) return Alert.alert("Faltan datos", "Nombre y apellido son obligatorios.");
    if (!dniValido(f.dni)) return Alert.alert("DNI inválido", "El DNI debe tener 8 dígitos.");
    if (!f.lugar.trim()) return Alert.alert("Faltan datos", "Indica dónde fue vista la persona por última vez.");
    if (!f.rep.trim() || f.tel.trim().length < 6) return Alert.alert("Faltan datos", "Tu nombre y un teléfono de contacto (mín. 6 dígitos) son obligatorios.");
    setEnviando(true);
    try {
      await crearPersona(server, { ...f, desc: f.desc?.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("success", "Persona registrada como BUSCADA. Compártelo por el Chat de emergencia.");
      onCreada();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("No se pudo crear", e?.message ?? "Error de conexión con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={m.root}>
        <View style={m.head}>
          <Text style={m.title}>Reportar persona desaparecida</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={m.close}>Cerrar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Campo label="Nombre *" value={f.nombre} onChange={set("nombre")} placeholder="Nombre(s)" />
          <Campo label="Apellidos *" value={f.apellido} onChange={set("apellido")} placeholder="Apellidos" />
          <Campo label="DNI *" value={f.dni} onChange={set("dni")} placeholder="8 dígitos" keyboardType="numeric" maxLength={8} />

          <Text style={m.label}>Región *</Text>
          <View style={m.chips}>
            {REGIONES.map((r) => (
              <PressableScale key={r} style={[m.chip, f.region === r && m.chipOn]} onPress={() => setF((x) => ({ ...x, region: r }))}>
                <Text style={[m.chipT, f.region === r && { color: "#fff" }]}>{r}</Text>
              </PressableScale>
            ))}
          </View>

          <Campo label="Última vez vista en *" value={f.lugar} onChange={set("lugar")} placeholder="Lugar o referencia" />
          <Campo label="Descripción (ropa, señas…)" value={f.desc ?? ""} onChange={set("desc")} placeholder="Opcional" multiline />
          <Campo label="Tu nombre (reportante) *" value={f.rep} onChange={set("rep")} placeholder="Quién reporta" />
          <Campo label="Tu teléfono *" value={f.tel} onChange={set("tel")} placeholder="Para recibir avisos" keyboardType="phone-pad" />

          <PressableScale style={[m.send, { opacity: enviando ? 0.6 : 1 }]} disabled={enviando} onPress={enviar} haptic="medium">
            <Icon name="alert" size={17} color="#fff" />
            <Text style={m.sendT}>{enviando ? "Enviando…" : "Registrar como BUSCADA"}</Text>
          </PressableScale>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Campo({
  label, value, onChange, placeholder, keyboardType, maxLength, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: "numeric" | "phone-pad";
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={m.label}>{label}</Text>
      <TextInput
        style={[m.input, multiline && { minHeight: 70, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
      />
    </View>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  backChevron: { fontSize: 26, color: C.primario, fontWeight: "400", marginTop: -3 },
  backT: { fontSize: 14, fontWeight: "800", color: C.primario },
  backTitulo: { fontSize: 13, fontWeight: "700", color: C.muted, marginLeft: "auto" },
  sec: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7, color: C.muted, marginTop: 8, marginBottom: 10 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 15, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: C.ink2, marginBottom: 6 },
  miniHint: { fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 10 },
  input: { fontSize: 15, padding: 11, borderWidth: 1.5, borderColor: C.line, borderRadius: 9, color: C.ink, marginBottom: 12 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 9, paddingVertical: 13 },
  btnTx: { color: "#fff", fontSize: 14.5, fontWeight: "700" },
  hint: { fontSize: 11.5, color: C.muted },
  pRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  pDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  pName: { fontWeight: "700", fontSize: 14, color: C.ink },
  pSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  pAct: { fontSize: 12.5, fontWeight: "800", color: C.verde, marginTop: 5 },
  pBadge: { fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, overflow: "hidden" },
  telGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  tel: { width: "47%", flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  telNum: { backgroundColor: C.alerta, color: "#fff", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 5, fontSize: 16, fontWeight: "900", overflow: "hidden" },
  telLbl: { fontSize: 13, fontWeight: "800", color: C.ink },
});

const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 52 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: "800", color: C.ink },
  close: { fontSize: 14, fontWeight: "700", color: C.primario },
  label: { fontSize: 12, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 },
  input: { fontSize: 14.5, padding: 11, borderWidth: 1.5, borderColor: C.line, borderRadius: 9, color: C.ink, backgroundColor: C.surface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: { borderWidth: 1.5, borderColor: C.line, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 11, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.primario, borderColor: C.primario },
  chipT: { fontSize: 12, fontWeight: "700", color: C.ink2 },
  send: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primario, borderRadius: 11, paddingVertical: 14, marginTop: 8 },
  sendT: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
