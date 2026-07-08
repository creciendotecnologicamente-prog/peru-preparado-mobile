import { useEffect, useState } from "react";
import { View, Text, Linking, StyleSheet } from "react-native";
import { Icon } from "../components/Icon";
import { FamilySync } from "../components/FamilySync";
import { PressableScale } from "../components/PressableScale";
import { ProgressRing } from "../components/ProgressRing";
import { Section } from "../components/Section";
import { IdeaGrowCredit } from "../components/IdeaGrow";
import { C } from "../theme";
import { type Profile, preparedness, nivelPreparacion } from "../lib/profile";
import { loadFamily } from "../lib/family";

export function Perfil({ profile, onEdit }: { profile: Profile | null; onEdit: () => void }) {
  const [sync, setSync] = useState(false);
  const [famCount, setFamCount] = useState(0);
  const [comoAbierto, setComoAbierto] = useState(false);
  const [privAbierto, setPrivAbierto] = useState(false);

  useEffect(() => {
    loadFamily().then((f) => setFamCount(f.length));
  }, [sync]);

  if (!profile) return null;
  const pct = preparedness(profile);
  const nivel = nivelPreparacion(pct);
  const tel = profile.contactoTel?.replace(/[^\d+]/g, "") ?? "";

  return (
    <View>
      {/* Identidad + nivel */}
      <View style={s.hero}>
        <View style={s.heroAv}>
          <Text style={s.heroInit}>{(profile.nombre || "?").trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.heroName}>{profile.nombre || "Sin nombre"}</Text>
        <Text style={s.heroSub}>DNI {profile.dni || "—"} · {profile.nacionalidad || "Perú"}</Text>
        <PressableScale style={s.editBtn} onPress={onEdit}>
          <Icon name="user" size={14} color="#fff" />
          <Text style={s.editT}>Editar mi ficha</Text>
        </PressableScale>
      </View>

      {/* Nivel de preparación */}
      <Section icon="shield" title="Tu preparación" hint="Sube el porcentaje completando tu ficha y tus listas." tone="verde" />
      <View style={s.card}>
        <View style={s.scoreRow}>
          <ProgressRing pct={pct} size={62} strokeWidth={6} color={nivel.color}>
            <Text style={[s.ringN, { color: nivel.color }]}>{pct}%</Text>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <Text style={[s.nivel, { color: nivel.color }]}>{nivel.label}</Text>
            <Text style={s.nivelHint}>Completa la pestaña Prepárate para subir tu nivel.</Text>
          </View>
        </View>
      </View>

      {/* Ficha familiar */}
      <Section icon="users" title="Ficha familiar" hint="Así te reconoce tu familia. Compártela por QR, sin internet." tone="azul" />
      <View style={s.card}>
        {profile.region ? <FRow k="Hogar" v={`${profile.region}${profile.vivienda ? " · " + profile.vivienda : ""}`} /> : null}
        {profile.miembros ? <FRow k="Familia" v={`${profile.miembros} persona(s)${profile.vulnerables.length ? " · " + profile.vulnerables.length + " vulnerable(s)" : ""}`} /> : null}
        {profile.mensaje ? <FRow k="Mensaje" v={`“${profile.mensaje}”`} /> : null}
        <PressableScale style={s.syncBtn} onPress={() => setSync(true)} haptic="medium">
          <Icon name="qr" size={17} color="#fff" />
          <Text style={s.syncT}>Sincronizar con mi familia{famCount ? ` · ${famCount}` : ""}</Text>
        </PressableScale>
      </View>

      {/* Contacto de emergencia */}
      <Section icon="phone" title="Contacto de emergencia" hint="A quién avisa la app cuando tocas “Estoy a salvo”." tone="rojo" />
      <View style={s.card}>
        {profile.contactoNombre || tel ? (
          <View style={s.contactoRow}>
            <View style={s.contactoAv}>
              <Icon name="user" size={20} color={C.primario} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contactoName}>{profile.contactoNombre || "Contacto"}</Text>
              <Text style={s.contactoTel}>{profile.contactoTel || "Sin teléfono"}</Text>
            </View>
            {tel.length >= 6 && (
              <PressableScale style={s.contactoCall} haptic="medium" onPress={() => Linking.openURL("tel:" + tel)}>
                <Icon name="phone" size={16} color="#fff" />
              </PressableScale>
            )}
          </View>
        ) : (
          <PressableScale style={s.addContacto} onPress={onEdit}>
            <Icon name="user" size={16} color={C.primario} />
            <Text style={s.addContactoT}>Agregar un contacto de emergencia</Text>
          </PressableScale>
        )}
      </View>

      {/* Cómo funciona (desplegable) */}
      <Section icon="info" title="Cómo funciona" hint="Todo lo que hace Perú Preparado, en simple." tone="azul" />
      <Desplegable abierto={comoAbierto} onToggle={() => setComoAbierto(!comoAbierto)} titulo="¿Cómo me protege la app?">
        <Explica icon="broadcast" t="Recibes alertas" d="La app vigila los sismos del IGP y USGS. Con vigilancia activa, te avisa aunque la tengas cerrada (requiere permiso de notificaciones)." />
        <Explica icon="zap" t="Durante el sismo" d="Calcula los segundos hasta el remezón, te guía a tu zona segura y avisa con vibración y voz." />
        <Explica icon="check" t="Avisas que estás a salvo" d="Con un toque, tu contacto de emergencia recibe un SMS con tu ubicación y la hora. El SMS suele funcionar aunque los datos móviles fallen." />
        <Explica icon="qr" t="Funciona sin internet" d="Los mensajes del chat de emergencia viajan de teléfono en teléfono por código QR, sin señal ni internet." />
        <Explica icon="shield" t="Tus datos son tuyos" d="Tu ficha, tu familia y tus listas se guardan solo en tu teléfono. No los subimos a ningún servidor." />
      </Desplegable>

      {/* Privacidad (desplegable) */}
      <Desplegable abierto={privAbierto} onToggle={() => setPrivAbierto(!privAbierto)} titulo="Privacidad y datos">
        <Text style={s.privText}>
          Tu ficha personal, tus contactos y tus listas de preparación se almacenan <Text style={s.bold}>únicamente en este dispositivo</Text> (no en la nube).
          {"\n\n"}Tu ubicación solo se comparte cuando tú tocas “Estoy a salvo” o pides una ruta. Nunca se envía en segundo plano.
          {"\n\n"}Al reportar una emergencia o una persona desaparecida, esos datos sí se envían al sistema de búsqueda para que otros puedan ayudar.
        </Text>
      </Desplegable>

      <IdeaGrowCredit />

      <FamilySync profile={profile} visible={sync} onClose={() => setSync(false)} />
    </View>
  );
}

function Desplegable({ abierto, onToggle, titulo, children }: { abierto: boolean; onToggle: () => void; titulo: string; children: React.ReactNode }) {
  return (
    <View style={[s.card, { padding: 0, overflow: "hidden" }]}>
      <PressableScale style={s.dispHead} onPress={onToggle}>
        <Text style={s.dispTitulo}>{titulo}</Text>
        <Text style={s.dispChevron}>{abierto ? "▲" : "▼"}</Text>
      </PressableScale>
      {abierto && <View style={s.dispBody}>{children}</View>}
    </View>
  );
}

function Explica({ icon, t, d }: { icon: string; t: string; d: string }) {
  return (
    <View style={s.explica}>
      <View style={s.explicaIc}>
        <Icon name={icon} size={17} color={C.primario} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.explicaT}>{t}</Text>
        <Text style={s.explicaD}>{d}</Text>
      </View>
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
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, marginBottom: 4 },
  bold: { fontWeight: "800", color: C.ink },

  hero: { alignItems: "center", paddingVertical: 8 },
  heroAv: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.primario, alignItems: "center", justifyContent: "center" },
  heroInit: { color: "#fff", fontSize: 32, fontWeight: "900" },
  heroName: { fontSize: 20, fontWeight: "900", color: C.ink, marginTop: 12 },
  heroSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.primario, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 16, marginTop: 12 },
  editT: { color: "#fff", fontSize: 13, fontWeight: "800" },

  scoreRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringN: { fontSize: 16, fontWeight: "900" },
  nivel: { fontSize: 16, fontWeight: "800" },
  nivelHint: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 16 },

  fRow: { flexDirection: "row", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  fK: { width: 70, fontSize: 11, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.3, paddingTop: 1 },
  fV: { flex: 1, fontSize: 13, color: C.ink2 },
  syncBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primario, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
  syncT: { color: "#fff", fontSize: 14.5, fontWeight: "800" },

  contactoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  contactoAv: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primarioSoft, alignItems: "center", justifyContent: "center" },
  contactoName: { fontSize: 15, fontWeight: "800", color: C.ink },
  contactoTel: { fontSize: 13, color: C.muted, marginTop: 1 },
  contactoCall: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.verde, alignItems: "center", justifyContent: "center" },
  addContacto: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6 },
  addContactoT: { color: C.primario, fontSize: 13.5, fontWeight: "800" },

  dispHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15 },
  dispTitulo: { fontSize: 14, fontWeight: "800", color: C.ink },
  dispChevron: { fontSize: 11, color: C.muted },
  dispBody: { paddingHorizontal: 15, paddingBottom: 15, gap: 14 },
  explica: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  explicaIc: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarioSoft, alignItems: "center", justifyContent: "center" },
  explicaT: { fontSize: 13.5, fontWeight: "800", color: C.ink },
  explicaD: { fontSize: 12.5, color: C.ink2, marginTop: 2, lineHeight: 18 },
  privText: { fontSize: 13, color: C.ink2, lineHeight: 20 },
});
