import { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, Alert, StyleSheet, Platform, TextInput } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Icon } from "./Icon";
import { C } from "../theme";
import type { Profile } from "../lib/profile";
import { type FamilyMember, encodeFicha, decodeFicha, loadFamily, saveFamily } from "../lib/family";

type Tab = "codigo" | "escanear" | "familia";

export function FamilySync({ profile, visible, onClose }: { profile: Profile; visible: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("codigo");
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [pasteCode, setPasteCode] = useState("");
  const scanLock = useRef(false);
  const isWeb = Platform.OS === "web";

  function copiarCodigo() {
    try {
      // @ts-ignore — navigator existe en web
      navigator.clipboard.writeText(encodeFicha(profile));
      Alert.alert("Copiado", "Tu código de ficha se copió. Compártelo con tu familia (WhatsApp, SMS…).");
    } catch {
      Alert.alert("No se pudo copiar", "Selecciona y copia el código manualmente.");
    }
  }

  useEffect(() => {
    if (visible) loadFamily().then(setFamily);
  }, [visible]);

  function persist(list: FamilyMember[]) {
    setFamily(list);
    saveFamily(list);
  }

  function onScan({ data }: { data: string }) {
    if (scanLock.current) return;
    const f = decodeFicha(data);
    if (!f) {
      scanLock.current = true;
      Alert.alert("Código no válido", "Ese QR no es una ficha de Perú Preparado.", [{ text: "OK", onPress: () => (scanLock.current = false) }]);
      return;
    }
    if (f.dni && f.dni === profile.dni) {
      scanLock.current = true;
      Alert.alert("Ese eres tú", "No puedes sincronizarte contigo mismo.", [{ text: "OK", onPress: () => (scanLock.current = false) }]);
      return;
    }
    if (family.some((m) => m.dni && m.dni === f.dni)) {
      scanLock.current = true;
      Alert.alert("Ya sincronizado", `${f.nombre || "Esta persona"} ya está en tu familia.`, [{ text: "OK", onPress: () => (scanLock.current = false) }]);
      return;
    }
    scanLock.current = true;
    const nuevo: FamilyMember = { ...f, id: Math.random().toString(36).slice(2), syncedAt: new Date().toISOString() };
    persist([nuevo, ...family]);
    Alert.alert("¡Sincronizado!", `${f.nombre || "Nueva persona"} se añadió a tu familia.`, [
      { text: "Ver familia", onPress: () => { scanLock.current = false; setTab("familia"); } },
    ]);
  }

  function eliminar(id: string) {
    persist(family.filter((m) => m.id !== id));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.head}>
          <Text style={s.title}>Sincronización familiar</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={s.close}>Cerrar</Text>
          </Pressable>
        </View>

        <View style={s.seg}>
          {([["codigo", "Mi código"], ["escanear", "Escanear"], ["familia", `Mi familia (${family.length})`]] as [Tab, string][]).map(([t, lbl]) => (
            <Pressable key={t} style={[s.segBtn, tab === t && s.segOn]} onPress={() => setTab(t)}>
              <Text style={[s.segT, tab === t && { color: "#fff" }]}>{lbl}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "codigo" && (
          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.lead}>Muestra este código a tu familia para que te reconozca. Funciona sin internet.</Text>
            <View style={s.qrCard}>
              <QRCode value={encodeFicha(profile)} size={220} backgroundColor="white" color={C.slate} />
            </View>
            <Text style={s.qrName}>{profile.nombre || "Sin nombre"}</Text>
            <Text style={s.qrSub}>DNI {profile.dni || "—"}{profile.region ? " · " + profile.region : ""}</Text>
            {isWeb && (
              <Pressable style={s.copyBtn} onPress={copiarCodigo}>
                <Icon name="message" size={15} color="#fff" />
                <Text style={s.copyT}>Copiar código para compartir</Text>
              </Pressable>
            )}
          </ScrollView>
        )}

        {tab === "escanear" && isWeb && (
          <ScrollView contentContainerStyle={s.body}>
            <Icon name="search" size={36} color={C.muted} />
            <Text style={[s.lead, { textAlign: "center", marginTop: 10 }]}>
              En la versión web, pega el código de ficha que te compartió tu familiar (desde “Copiar código”).
            </Text>
            <TextInput
              style={s.pasteInput}
              value={pasteCode}
              onChangeText={setPasteCode}
              placeholder="Pega aquí el código (PPF1:…)"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={s.permBtn}
              onPress={() => {
                onScan({ data: pasteCode.trim() });
                setPasteCode("");
              }}
            >
              <Text style={s.permT}>Añadir a mi familia</Text>
            </Pressable>
          </ScrollView>
        )}

        {tab === "escanear" && !isWeb && (
          <View style={{ flex: 1 }}>
            {!permission ? (
              <View style={s.body}><Text style={s.lead}>Preparando cámara…</Text></View>
            ) : !permission.granted ? (
              <View style={s.body}>
                <Icon name="search" size={40} color={C.muted} />
                <Text style={[s.lead, { textAlign: "center", marginTop: 12 }]}>Necesitamos la cámara para escanear el QR de tu familia.</Text>
                <Pressable style={s.permBtn} onPress={requestPermission}>
                  <Text style={s.permT}>Permitir cámara</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />
                <View style={s.scanHint}>
                  <Text style={s.scanHintT}>Apunta al código QR de tu familiar</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {tab === "familia" && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {family.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Icon name="users" size={40} color={C.muted} />
                <Text style={[s.lead, { textAlign: "center", marginTop: 12 }]}>Aún no has sincronizado a nadie. Ve a “Escanear” y captura el QR de tu familia.</Text>
              </View>
            ) : (
              family.map((m) => (
                <View key={m.id} style={s.member}>
                  <View style={s.mAv}><Icon name="users" size={18} color={C.primario} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mName}>{m.nombre || "Sin nombre"}</Text>
                    <Text style={s.mSub}>DNI {m.dni || "—"}{m.region ? " · " + m.region : ""}</Text>
                    {m.mensaje ? <Text style={s.mMsg}>“{m.mensaje}”</Text> : null}
                  </View>
                  <Pressable onPress={() => eliminar(m.id)} hitSlop={8}>
                    <Text style={s.del}>Quitar</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 52 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: C.ink },
  close: { fontSize: 14, fontWeight: "700", color: C.primario },
  seg: { flexDirection: "row", marginHorizontal: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: "hidden", marginBottom: 4 },
  segBtn: { flex: 1, paddingVertical: 11, alignItems: "center" },
  segOn: { backgroundColor: C.primario },
  segT: { fontSize: 12.5, fontWeight: "700", color: C.muted },
  body: { padding: 22, alignItems: "center" },
  lead: { fontSize: 14, color: C.ink2, lineHeight: 20 },
  qrCard: { backgroundColor: "#fff", padding: 22, borderRadius: 18, marginTop: 18, borderWidth: 1, borderColor: C.line },
  qrName: { fontSize: 18, fontWeight: "800", color: C.ink, marginTop: 16 },
  qrSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  permBtn: { backgroundColor: C.primario, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 22, marginTop: 16 },
  permT: { color: "#fff", fontWeight: "800", fontSize: 15 },
  scanHint: { position: "absolute", bottom: 28, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16 },
  scanHintT: { color: "#fff", fontSize: 13, fontWeight: "600" },
  member: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 13, marginBottom: 9 },
  mAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.rojoSoft, alignItems: "center", justifyContent: "center" },
  mName: { fontSize: 15, fontWeight: "800", color: C.ink },
  mSub: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  mMsg: { fontSize: 12.5, color: C.ink2, marginTop: 3, fontStyle: "italic" },
  del: { fontSize: 12.5, fontWeight: "700", color: C.rojo },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.azul, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 20, marginTop: 16 },
  copyT: { color: "#fff", fontWeight: "800", fontSize: 14 },
  pasteInput: { alignSelf: "stretch", fontSize: 14, padding: 13, borderWidth: 1.5, borderColor: C.line, borderRadius: 11, color: C.ink, backgroundColor: C.surface, marginTop: 16 },
});
