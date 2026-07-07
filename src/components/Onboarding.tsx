import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Switch, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { C } from "../theme";
import { type Profile, emptyProfile, preparedness } from "../lib/profile";

const VULN = ["Adultos mayores", "Niños pequeños", "Personas con discapacidad", "Embarazo", "Mascotas"];
const VIVIENDA = ["Casa", "Departamento", "Quinta / solar", "Otro"];
const MATERIAL = ["Material noble", "Adobe", "Madera", "Prefabricada"];
const RIESGOS = ["Cerca de la costa", "Ladera o cerro", "Río", "Quebrada"];
const TOTAL = 6;

export function Onboarding({ initial, onFinish, onClose }: { initial?: Profile; onFinish: (p: Profile) => void; onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(initial ?? emptyProfile);
  const set = (patch: Partial<Profile>) => setP((prev) => ({ ...prev, ...patch }));
  const toggleArr = (key: "vulnerables" | "riesgos", v: string) =>
    setP((prev) => ({ ...prev, [key]: prev[key].includes(v) ? prev[key].filter((x) => x !== v) : [...prev[key], v] }));

  const dniOk = p.dni.length === 8;
  const canNext = step !== 1 || (p.nombre.trim().length > 0 && dniOk);

  function next() {
    if (step < TOTAL - 1) setStep(step + 1);
    else onFinish({ ...p, completedAt: new Date().toISOString() });
  }

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Encabezado / progreso */}
      <View style={st.top}>
        <View style={st.bar}>
          <View style={[st.barFill, { width: `${((step + 1) / TOTAL) * 100}%` }]} />
        </View>
        <View style={st.topRow}>
          <Text style={st.paso}>Paso {step + 1} de {TOTAL}</Text>
          {onClose && (
            <Pressable onPress={onClose}>
              <Text style={st.cerrar}>Cerrar</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={{ alignItems: "center", paddingTop: 14 }}>
            <View style={st.hero}>
              <Icon name="shield" size={42} color="#fff" />
            </View>
            <Text style={st.h1}>Hola, vamos a conocernos</Text>
            <Text style={[st.lead, { textAlign: "center" }]}>
              Antes de empezar, responde un breve <Text style={{ fontWeight: "800", color: C.ink }}>Test de Conocimiento</Text>. Toma 1 minuto y nos ayuda a:
            </Text>
            <Bullet text="Calcular tu nivel de preparación ante un sismo" />
            <Bullet text="Que tu familia te reconozca y te encuentre en una emergencia" />
            <Bullet text="Preparar la sincronización familiar por Bluetooth" />
            <View style={st.priv}>
              <Icon name="check" size={15} color={C.verde} />
              <Text style={st.privT}>Tus datos se guardan solo en tu teléfono.</Text>
            </View>
          </View>
        )}

        {step === 1 && (
          <Step icon="users" title="Sobre ti" lead="Tu identidad para reconocerte en una emergencia.">
            <Field label="Nombre y apellido *">
              <TextInput style={st.input} value={p.nombre} onChangeText={(v) => set({ nombre: v })} placeholder="Ej: María Quispe" placeholderTextColor={C.muted} />
            </Field>
            <Field label="DNI (8 dígitos) *" hint={p.dni.length > 0 && !dniOk ? "El DNI debe tener 8 dígitos" : "Se validaría con Reniec en el sistema oficial"} hintErr={p.dni.length > 0 && !dniOk}>
              <TextInput style={st.input} value={p.dni} onChangeText={(v) => set({ dni: v.replace(/\D/g, "").slice(0, 8) })} keyboardType="number-pad" placeholder="8 dígitos" placeholderTextColor={C.muted} />
            </Field>
            <Field label="Nacionalidad">
              <TextInput style={st.input} value={p.nacionalidad} onChangeText={(v) => set({ nacionalidad: v })} placeholder="Peruana" placeholderTextColor={C.muted} />
            </Field>
          </Step>
        )}

        {step === 2 && (
          <Step icon="users" title="Tu familia" lead="Para la sincronización familiar y para priorizar a quien más lo necesita.">
            <Field label="¿Cuántas personas viven en tu hogar?">
              <TextInput style={st.input} value={p.miembros} onChangeText={(v) => set({ miembros: v.replace(/\D/g, "").slice(0, 2) })} keyboardType="number-pad" placeholder="Ej: 4" placeholderTextColor={C.muted} />
            </Field>
            <Field label="Contacto de emergencia (nombre)">
              <TextInput style={st.input} value={p.contactoNombre} onChangeText={(v) => set({ contactoNombre: v })} placeholder="Ej: Juan Quispe" placeholderTextColor={C.muted} />
            </Field>
            <Field label="Teléfono del contacto">
              <TextInput style={st.input} value={p.contactoTel} onChangeText={(v) => set({ contactoTel: v })} keyboardType="phone-pad" placeholder="Ej: 999 888 777" placeholderTextColor={C.muted} />
            </Field>
            <Field label="¿Hay personas vulnerables en casa?" hint="Toca las que apliquen">
              <Chips options={VULN} selected={p.vulnerables} onToggle={(v) => toggleArr("vulnerables", v)} />
            </Field>
          </Step>
        )}

        {step === 3 && (
          <Step icon="home" title="Tu hogar" lead="Las condiciones de tu vivienda definen tu riesgo real.">
            <Field label="Región o distrito">
              <TextInput style={st.input} value={p.region} onChangeText={(v) => set({ region: v })} placeholder="Ej: San Juan de Lurigancho, Lima" placeholderTextColor={C.muted} />
            </Field>
            <Field label="Tipo de vivienda">
              <Chips options={VIVIENDA} selected={p.vivienda ? [p.vivienda] : []} onToggle={(v) => set({ vivienda: p.vivienda === v ? "" : v })} />
            </Field>
            <Field label="Material de construcción">
              <Chips options={MATERIAL} selected={p.material ? [p.material] : []} onToggle={(v) => set({ material: p.material === v ? "" : v })} />
            </Field>
            <Field label="¿Tu casa está en zona de riesgo?" hint="Toca las que apliquen">
              <Chips options={RIESGOS} selected={p.riesgos} onToggle={(v) => toggleArr("riesgos", v)} />
            </Field>
          </Step>
        )}

        {step === 4 && (
          <Step icon="check" title="¿Qué tan preparado estás?" lead="Sé honesto: esto define tu porcentaje de preparación.">
            <ToggleRow label="¿Tienes una mochila de emergencia lista?" value={p.mochila} onChange={(v) => set({ mochila: v })} />
            <ToggleRow label="¿Conoces tu zona segura y rutas de evacuación?" value={p.zonaSegura} onChange={(v) => set({ zonaSegura: v })} />
            <ToggleRow label="¿Tu familia tiene un plan y punto de encuentro?" value={p.planFamiliar} onChange={(v) => set({ planFamiliar: v })} />
            <ToggleRow label="¿Sabes cortar la luz, el agua y el gas?" value={p.cortarServicios} onChange={(v) => set({ cortarServicios: v })} />
            <View style={st.scoreBox}>
              <Text style={st.scoreN}>{preparedness(p)}%</Text>
              <Text style={st.scoreL}>de preparación con tus respuestas actuales</Text>
            </View>
          </Step>
        )}

        {step === 5 && (
          <Step icon="message" title="Un mensaje para los demás" lead="Opcional. Aparecerá en tu ficha cuando te sincronices con tu familia o vecinos.">
            <Field label="Tu mensaje (opcional)">
              <TextInput style={[st.input, { height: 90, textAlignVertical: "top" }]} value={p.mensaje} onChangeText={(v) => set({ mensaje: v })} multiline placeholder="Ej: Estoy bien, nos vemos en el punto de encuentro." placeholderTextColor={C.muted} />
            </Field>
            <View style={st.finBox}>
              <Icon name="broadcast" size={20} color={C.azul} />
              <Text style={st.finT}>
                Listo. Tu ficha quedará lista para la <Text style={{ fontWeight: "800" }}>Sincronización Familiar por Bluetooth</Text> (próximo bloque).
              </Text>
            </View>
          </Step>
        )}
      </ScrollView>

      {/* Pie de navegación */}
      <View style={st.foot}>
        {step > 0 ? (
          <Pressable style={[st.btn, st.btnGhost]} onPress={() => setStep(step - 1)}>
            <Text style={st.btnGhostT}>Atrás</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable style={[st.btn, st.btnMain, !canNext && { opacity: 0.5 }]} disabled={!canNext} onPress={next}>
          <Text style={st.btnMainT}>{step === TOTAL - 1 ? "Finalizar" : step === 0 ? "Empezar" : "Siguiente"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Step({ icon, title, lead, children }: { icon: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <View>
      <View style={st.stepHead}>
        <View style={st.stepIc}>
          <Icon name={icon} size={22} color={C.rojo} />
        </View>
        <Text style={st.h1}>{title}</Text>
      </View>
      <Text style={st.lead}>{lead}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}
function Field({ label, hint, hintErr, children }: { label: string; hint?: string; hintErr?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={st.label}>{label}</Text>
      {children}
      {hint ? <Text style={[st.hint, hintErr && { color: C.rojo }]}>{hint}</Text> : null}
    </View>
  );
}
function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable key={o} style={[st.chip, on && st.chipOn]} onPress={() => onToggle(o)}>
            <Text style={[st.chipT, on && { color: "#fff" }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={st.toggle}>
      <Text style={st.toggleL}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.verde }} />
    </View>
  );
}
function Bullet({ text }: { text: string }) {
  return (
    <View style={st.bullet}>
      <View style={st.bdot} />
      <Text style={st.bt}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { paddingTop: Platform.OS === "ios" ? 56 : 30, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line },
  bar: { height: 6, borderRadius: 6, backgroundColor: C.surface2, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: C.rojo, borderRadius: 6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  paso: { fontSize: 12, fontWeight: "700", color: C.muted },
  cerrar: { fontSize: 13, fontWeight: "700", color: C.rojo },
  hero: { width: 86, height: 86, borderRadius: 24, backgroundColor: C.rojo, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: "800", color: C.ink },
  lead: { fontSize: 14, color: C.ink2, lineHeight: 21, marginTop: 6 },
  bullet: { flexDirection: "row", gap: 10, alignItems: "flex-start", alignSelf: "stretch", marginTop: 12 },
  bdot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.rojo, marginTop: 6 },
  bt: { flex: 1, fontSize: 14, color: C.ink2, lineHeight: 20 },
  priv: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, backgroundColor: C.verdeSoft, borderRadius: 10, padding: 12, alignSelf: "stretch" },
  privT: { fontSize: 12.5, color: C.verde, fontWeight: "600", flex: 1 },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  stepIc: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.rojoSoft, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13.5, fontWeight: "700", color: C.ink2, marginBottom: 7 },
  input: { fontSize: 16, padding: 13, borderWidth: 1.5, borderColor: C.line, borderRadius: 11, color: C.ink, backgroundColor: C.surface },
  hint: { fontSize: 11.5, color: C.muted, marginTop: 5 },
  chip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.rojo, borderColor: C.rojo },
  chipT: { fontSize: 12.5, fontWeight: "600", color: C.ink2 },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, marginBottom: 10 },
  toggleL: { flex: 1, fontSize: 14, color: C.ink, lineHeight: 19 },
  scoreBox: { alignItems: "center", marginTop: 6, backgroundColor: C.slate, borderRadius: 14, paddingVertical: 18 },
  scoreN: { fontSize: 40, fontWeight: "900", color: "#fff" },
  scoreL: { fontSize: 12, color: "#fff", opacity: 0.85, marginTop: 2 },
  finBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: C.azulSoft, borderRadius: 12, padding: 14, marginTop: 4 },
  finT: { flex: 1, fontSize: 13, color: C.ink2, lineHeight: 19 },
  foot: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: Platform.OS === "ios" ? 30 : 16, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnMain: { backgroundColor: C.rojo },
  btnMainT: { color: "#fff", fontSize: 15.5, fontWeight: "800" },
  btnGhost: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line },
  btnGhostT: { color: C.ink2, fontSize: 15.5, fontWeight: "700" },
});
