import { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, TextInput, ScrollView, Alert, Platform, Linking, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";
import { C } from "../theme";
import type { Profile } from "../lib/profile";
import { loadFamily, type FamilyMember } from "../lib/family";
import { defaultServer } from "../lib/server";
import { ubicacionRapida, mapsUrl } from "../lib/ubicacion";
import {
  MeshNode,
  BroadcastTransport,
  RelayTransport,
  encodeMeshQR,
  decodeMeshQR,
  loadMeshState,
  saveMeshName,
  saveMeshMsgs,
  saveMeshServer,
  saveMeshRoom,
  type MeshMessage,
} from "../lib/mesh";

const KIND_ICON: Record<string, string> = { safe: "check", sos: "sos", busco: "search" };
const KIND_COLOR: Record<string, string> = { safe: C.verde, sos: C.rojo, busco: C.azul };

export function RedMalla({ profile }: { profile?: Profile | null }) {
  const nodeRef = useRef<MeshNode | null>(null);
  const relayRef = useRef<RelayTransport | null>(null);
  const [listo, setListo] = useState(false);
  const [name, setName] = useState("Mi teléfono");
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [peers, setPeers] = useState(0);
  const [msgs, setMsgs] = useState<MeshMessage[]>([]);
  const [text, setText] = useState("");
  const [server, setServer] = useState("");
  const [room, setRoom] = useState("PERU");
  const [salaOn, setSalaOn] = useState(false);
  const [salaOk, setSalaOk] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [avanzado, setAvanzado] = useState(false);

  useEffect(() => {
    loadFamily().then(setFamily);
  }, []);

  useEffect(() => {
    let node: MeshNode | null = null;
    loadMeshState(profile?.nombre || "Mi teléfono", defaultServer()).then((st) => {
      node = new MeshNode(st.id, st.name);
      node.seed(st.messages);
      setName(st.name);
      setServer(st.server);
      setRoom(st.room);
      setMsgs([...node.messages]);
      node.onChange = () => {
        if (!node) return;
        node.messages = node.messages.slice(0, 60);
        setMsgs([...node.messages]);
        setPeers(node.peers.size);
        saveMeshMsgs(node.messages);
      };
      if (BroadcastTransport.disponible()) node.addTransport(new BroadcastTransport());
      node.start();
      nodeRef.current = node;
      // Conexión AUTOMÁTICA al canal de emergencia: nadie tiene que
      // configurar nada. Si hay internet, los mensajes llegan a todo el
      // canal (app y web); si no hay, siguen viajando por QR.
      if (st.server) conectar(node, st.server, st.room || "PERU");
      setListo(true);
    });
    return () => {
      node?.stop();
      nodeRef.current = null;
      relayRef.current = null;
    };
  }, []);

  function conectar(node: MeshNode, base: string, code: string) {
    if (relayRef.current) node.removeTransport(relayRef.current);
    const rt = new RelayTransport(base.replace(/\/$/, ""), code.toUpperCase(), node.id);
    rt.onStatus = setSalaOk;
    node.addTransport(rt);
    relayRef.current = rt;
    setSalaOn(true);
  }

  function cambiarNombre(v: string) {
    setName(v);
    saveMeshName(v);
    if (nodeRef.current) nodeRef.current.name = v;
  }

  async function enviar(t: string, kind = "texto") {
    if (!t.trim() || !nodeRef.current) return;
    // safe/sos viajan con tu DNI (tu familia te reconoce por su ficha) y con
    // tu ubicación real si el GPS responde — nunca con una posición inventada.
    const esEstado = kind === "safe" || kind === "sos";
    const conDni = esEstado ? profile?.dni || undefined : undefined;
    const coords = esEstado ? await ubicacionRapida() : null;
    nodeRef.current.send(t, kind, { dni: conDni, ...(coords ?? {}) });
  }
  function enviarInput() {
    if (!text.trim()) return;
    const busca = text.trim().toLowerCase().startsWith("busco a");
    enviar(text, busca ? "busco" : "texto");
    setText("");
  }

  function conectarManual() {
    const node = nodeRef.current;
    if (!node) return;
    const base = server.trim().replace(/\/$/, "");
    if (!base) {
      Alert.alert("Falta el servidor", "Escribe la dirección del servidor (p. ej. http://192.168.1.10:3000).");
      return;
    }
    const code = (room.trim() || "PERU").toUpperCase();
    setRoom(code);
    saveMeshRoom(code);
    saveMeshServer(base);
    conectar(node, base, code);
  }

  function desconectar() {
    const node = nodeRef.current;
    if (node && relayRef.current) node.removeTransport(relayRef.current);
    relayRef.current = null;
    setSalaOn(false);
    setSalaOk(false);
  }

  if (!listo) {
    return (
      <View style={s.card}>
        <Text style={s.hint}>Preparando el chat de emergencia…</Text>
      </View>
    );
  }

  const enLinea = salaOn && salaOk;

  return (
    <View>
      <View style={s.card}>
        {/* Estado en palabras simples */}
        <View style={[s.status, { backgroundColor: enLinea ? C.verdeSoft : C.ambarSoft }]}>
          <View style={[s.sdot, { backgroundColor: enLinea ? C.verde : C.ambar }]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.statusT, { color: enLinea ? C.verde : C.ambar }]}>
              {enLinea ? `En línea · canal ${room}` : "Sin conexión al canal"}
            </Text>
            <Text style={s.statusS}>
              {enLinea
                ? `Tus mensajes llegan a todos en el canal${peers > 0 ? ` · ${peers} cerca` : ""}`
                : "Tus mensajes se guardan y pueden viajar por QR de mano en mano"}
            </Text>
          </View>
        </View>

        {/* Botones grandes de estado */}
        <View style={s.qrow}>
          <PressableScale style={[s.qbtn, { backgroundColor: C.verdeSoft }]} onPress={() => enviar("Estoy a salvo", "safe")} haptic="medium">
            <Icon name="check" size={16} color={C.verde} />
            <Text style={[s.qbtnT, { color: C.verde }]}>Estoy a salvo</Text>
          </PressableScale>
          <PressableScale style={[s.qbtn, { backgroundColor: C.rojoSoft }]} onPress={() => enviar("Necesito ayuda", "sos")} haptic="medium">
            <Icon name="sos" size={16} color={C.rojo} />
            <Text style={[s.qbtnT, { color: C.rojo }]}>Necesito ayuda</Text>
          </PressableScale>
          <PressableScale style={[s.qbtn, { backgroundColor: C.azulSoft }]} onPress={() => setText("Busco a: ")}>
            <Icon name="search" size={16} color={C.azul} />
            <Text style={[s.qbtnT, { color: C.azul }]}>Busco a alguien</Text>
          </PressableScale>
        </View>

        {/* Envío de texto libre */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={C.muted}
            onSubmitEditing={enviarInput}
            returnKeyType="send"
          />
          <PressableScale style={s.sendBtn} onPress={enviarInput}>
            <Text style={s.sendT}>Enviar</Text>
          </PressableScale>
        </View>

        {/* Mensajes */}
        <View style={s.msgs}>
          {msgs.length === 0 ? (
            <Text style={[s.hint, { padding: 10 }]}>
              Aún no hay mensajes. Toca “Estoy a salvo” para mandar el primero.
            </Text>
          ) : (
            msgs.slice(0, 20).map((m) => (
              <View key={m.id} style={[s.msg, m.mine && s.msgMine]}>
                <View style={s.msgHead}>
                  {KIND_ICON[m.kind] ? <Icon name={KIND_ICON[m.kind]} size={13} color={KIND_COLOR[m.kind] ?? C.ink2} /> : null}
                  <Text style={s.msgFrom}>{m.mine ? "Tú" : m.fromName}</Text>
                  {!m.mine && m.hops > 0 && (
                    <Text style={s.hops}>reenviado {m.hops} {m.hops === 1 ? "vez" : "veces"}</Text>
                  )}
                  <Text style={s.msgTime}>
                    {new Date(m.ts).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <Text style={s.msgText}>{m.text}</Text>
                {Number.isFinite(m.lat) && Number.isFinite(m.lon) && (
                  <Pressable onPress={() => Linking.openURL(mapsUrl(m.lat!, m.lon!))} hitSlop={6}>
                    <Text style={s.verUbic}>📍 Ver ubicación en el mapa</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>
      </View>

      {/* Estado de mi familia (fichas sincronizadas por QR) */}
      {family.length > 0 && (
        <View style={s.card}>
          <View style={s.secRow}>
            <Icon name="users" size={18} color={C.ink2} />
            <Text style={s.secT}>¿Cómo está mi familia?</Text>
          </View>
          {family.map((m) => {
            // msgs va del más reciente al más antiguo: find = último estado.
            const ult = m.dni ? msgs.find((x) => x.dni === m.dni && (x.kind === "safe" || x.kind === "sos")) : undefined;
            const color = !ult ? C.muted : ult.kind === "safe" ? C.verde : C.rojo;
            const estado = !ult
              ? "Sin noticias todavía"
              : `${ult.kind === "safe" ? "Avisó que está a salvo" : "Pidió ayuda"} · ${new Date(ult.ts).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
            return (
              <View key={m.id} style={s.famRow}>
                <View style={[s.famDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.famName}>{m.nombre || "Sin nombre"}</Text>
                  <Text style={[s.famEstado, { color }]}>{estado}</Text>
                </View>
                {ult && Number.isFinite(ult.lat) && Number.isFinite(ult.lon) && (
                  <Pressable style={s.famUbic} onPress={() => Linking.openURL(mapsUrl(ult.lat!, ult.lon!))} hitSlop={6}>
                    <Text style={s.famUbicT}>📍 Ver ubicación</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          <Text style={[s.hint, { marginTop: 8 }]}>
            Cuando alguien de tu familia toque “Estoy a salvo” o “Necesito ayuda”, aparecerá aquí automáticamente.
          </Text>
        </View>
      )}

      {/* Relevo por QR — sin internet */}
      <View style={s.card}>
        <View style={s.secRow}>
          <Icon name="qr" size={18} color={C.ink2} />
          <Text style={s.secT}>¿Sin señal? Pasa tus mensajes por QR</Text>
        </View>
        <Text style={s.body}>
          Aunque no haya internet ni señal, tus mensajes pueden viajar de teléfono en teléfono con un código QR, como pasar una carta de mano en mano.
        </Text>
        <PressableScale style={[s.btn, { backgroundColor: C.slate, marginTop: 10 }]} onPress={() => setQrVisible(true)}>
          <Icon name="qr" size={17} color="#fff" />
          <Text style={s.btnT}>Abrir el intercambio por QR</Text>
        </PressableScale>
      </View>

      {/* Opciones avanzadas (colapsadas: casi nadie las necesita) */}
      <Pressable style={s.avzHead} onPress={() => setAvanzado(!avanzado)}>
        <Text style={s.avzHeadT}>Opciones avanzadas</Text>
        <Text style={s.avzChevron}>{avanzado ? "▲" : "▼"}</Text>
      </Pressable>
      {avanzado && (
        <View style={s.card}>
          <Text style={s.body}>
            La app se conecta sola al canal nacional. Aquí puedes cambiar de canal (p. ej. uno solo para tu familia: “FAMILIA-PEREZ”) o usar un servidor propio en tu red local, que funciona sin salida a internet.
          </Text>
          <Text style={[s.label, { marginTop: 12 }]}>Tu nombre en el chat</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={cambiarNombre}
            placeholder="Nombre de tu dispositivo"
            placeholderTextColor={C.muted}
          />
          <Text style={s.label}>Canal</Text>
          <TextInput
            style={s.input}
            value={room}
            onChangeText={setRoom}
            placeholder="Código del canal (p. ej. PERU)"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
          />
          <Text style={s.label}>Servidor</Text>
          <TextInput
            style={s.input}
            value={server}
            onChangeText={setServer}
            placeholder="https://peru-te-busca.fly.dev o http://IP:3000"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PressableScale style={[s.btn, { flex: 1, backgroundColor: C.primario }]} onPress={conectarManual}>
              <Icon name="wifi" size={16} color="#fff" />
              <Text style={s.btnT}>Reconectar</Text>
            </PressableScale>
            {salaOn && (
              <PressableScale style={[s.btn, { flex: 1, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line }]} onPress={desconectar}>
                <Text style={[s.btnT, { color: C.ink2 }]}>Desconectar</Text>
              </PressableScale>
            )}
          </View>
          <Text style={[s.hint, { marginTop: 10 }]}>
            Bluetooth de teléfono a teléfono: llegará con la próxima versión (requiere build nativo). El QR y el canal ya usan la misma red.
          </Text>
        </View>
      )}

      <QrModal visible={qrVisible} onClose={() => setQrVisible(false)} node={nodeRef.current} msgs={msgs} />
    </View>
  );
}

/* ---------- Modal de intercambio QR ---------- */
function QrModal({ visible, onClose, node, msgs }: { visible: boolean; onClose: () => void; node: MeshNode | null; msgs: MeshMessage[] }) {
  const [tab, setTab] = useState<"mostrar" | "escanear">("mostrar");
  const [permission, requestPermission] = useCameraPermissions();
  const [pasteCode, setPasteCode] = useState("");
  const scanLock = useRef(false);
  const isWeb = Platform.OS === "web";

  function onScan({ data }: { data: string }) {
    if (scanLock.current || !node) return;
    const pkts = decodeMeshQR(data);
    if (!pkts) {
      scanLock.current = true;
      Alert.alert("QR no válido", "Ese código no es de Perú Preparado. Pide a la otra persona que abra “Mostrar mi QR”.", [
        { text: "OK", onPress: () => (scanLock.current = false) },
      ]);
      return;
    }
    scanLock.current = true;
    const nuevos = node.ingest(pkts);
    Alert.alert(
      nuevos > 0 ? "¡Mensajes recibidos!" : "Nada nuevo",
      nuevos > 0 ? `${nuevos} mensaje(s) nuevo(s) entraron a tu teléfono y seguirán viajando.` : "Ya tenías todos los mensajes de ese QR.",
      [{ text: "OK", onPress: () => { scanLock.current = false; if (nuevos > 0) onClose(); } }],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={q.root}>
        <View style={q.head}>
          <Text style={q.title}>Mensajes por QR</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={q.close}>Cerrar</Text>
          </Pressable>
        </View>

        {/* Cómo funciona, en 3 pasos */}
        <View style={q.pasos}>
          <Paso n="1" t="Tú muestras tu QR" />
          <Paso n="2" t="La otra persona lo escanea" />
          <Paso n="3" t="Sus mensajes y los tuyos se combinan y siguen viajando" />
        </View>

        <View style={q.seg}>
          {([["mostrar", "Mostrar mi QR"], ["escanear", "Escanear"]] as ["mostrar" | "escanear", string][]).map(([t, lbl]) => (
            <Pressable key={t} style={[q.segBtn, tab === t && q.segOn]} onPress={() => setTab(t)}>
              <Text style={[q.segT, tab === t && { color: "#fff" }]}>{lbl}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "mostrar" && (
          <ScrollView contentContainerStyle={q.body}>
            {msgs.length === 0 ? (
              <>
                <Icon name="message" size={36} color={C.muted} />
                <Text style={[q.lead, { textAlign: "center", marginTop: 10 }]}>
                  Aún no tienes mensajes que compartir. Envía uno (p. ej. “Estoy a salvo”) y vuelve aquí.
                </Text>
              </>
            ) : (
              <>
                <Text style={q.lead}>La otra persona abre Perú Preparado, entra a “Escanear” y apunta a este código:</Text>
                <View style={q.qrCard}>
                  <QRCode value={encodeMeshQR(msgs)} size={240} backgroundColor="white" color={C.slate} />
                </View>
                <Text style={q.sub}>{Math.min(msgs.length, 8)} mensaje(s) en este QR</Text>
              </>
            )}
          </ScrollView>
        )}

        {tab === "escanear" && isWeb && (
          <ScrollView contentContainerStyle={q.body}>
            <Icon name="search" size={36} color={C.muted} />
            <Text style={[q.lead, { textAlign: "center", marginTop: 10 }]}>
              En la versión web, pega el contenido del QR (PPM1:…) que te compartieron.
            </Text>
            <TextInput
              style={q.pasteInput}
              value={pasteCode}
              onChangeText={setPasteCode}
              placeholder="Pega aquí el paquete (PPM1:…)"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={q.permBtn}
              onPress={() => {
                onScan({ data: pasteCode.trim() });
                setPasteCode("");
              }}
            >
              <Text style={q.permT}>Recibir mensajes</Text>
            </Pressable>
          </ScrollView>
        )}

        {tab === "escanear" && !isWeb && (
          <View style={{ flex: 1 }}>
            {!permission ? (
              <View style={q.body}>
                <Text style={q.lead}>Preparando cámara…</Text>
              </View>
            ) : !permission.granted ? (
              <View style={q.body}>
                <Icon name="search" size={40} color={C.muted} />
                <Text style={[q.lead, { textAlign: "center", marginTop: 12 }]}>
                  Necesitamos la cámara para escanear el QR del otro teléfono.
                </Text>
                <Pressable style={q.permBtn} onPress={requestPermission}>
                  <Text style={q.permT}>Permitir cámara</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />
                <View style={q.scanHint}>
                  <Text style={q.scanHintT}>Apunta al QR del otro teléfono</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

function Paso({ n, t }: { n: string; t: string }) {
  return (
    <View style={q.paso}>
      <View style={q.pasoN}>
        <Text style={q.pasoNT}>{n}</Text>
      </View>
      <Text style={q.pasoT}>{t}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 15, marginBottom: 12 },
  status: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 11 },
  sdot: { width: 10, height: 10, borderRadius: 5 },
  statusT: { fontSize: 13, fontWeight: "800" },
  statusS: { fontSize: 11, color: C.muted, marginTop: 1, lineHeight: 15 },
  label: { fontSize: 11, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 },
  input: { fontSize: 14.5, padding: 11, borderWidth: 1.5, borderColor: C.line, borderRadius: 9, color: C.ink, marginBottom: 11, backgroundColor: C.surface },
  qrow: { flexDirection: "row", gap: 7, marginBottom: 11 },
  qbtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 9, paddingVertical: 12, paddingHorizontal: 4 },
  qbtnT: { fontSize: 10.5, fontWeight: "800" },
  sendBtn: { backgroundColor: C.primario, borderRadius: 9, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  sendT: { color: "#fff", fontWeight: "800", fontSize: 14 },
  msgs: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  msg: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  msgMine: { opacity: 0.85 },
  msgHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  msgFrom: { fontWeight: "800", fontSize: 12.5, color: C.ink },
  hops: { fontSize: 10, fontWeight: "700", color: C.azul, backgroundColor: C.azulSoft, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" },
  msgTime: { marginLeft: "auto", fontSize: 10.5, color: C.muted },
  msgText: { fontSize: 13.5, color: C.ink2, marginTop: 3, lineHeight: 19 },
  verUbic: { fontSize: 12, fontWeight: "800", color: C.azul, marginTop: 5 },
  secRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 7 },
  secT: { fontWeight: "700", fontSize: 14, color: C.ink },
  body: { fontSize: 13, color: C.ink2, lineHeight: 19 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 12 },
  btnT: { color: "#fff", fontSize: 14, fontWeight: "800" },
  famRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  famDot: { width: 10, height: 10, borderRadius: 5 },
  famName: { fontWeight: "700", fontSize: 13.5, color: C.ink },
  famEstado: { fontSize: 11.5, fontWeight: "600", marginTop: 1 },
  famUbic: { backgroundColor: C.azulSoft, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9 },
  famUbicT: { fontSize: 10.5, fontWeight: "800", color: C.azul },
  avzHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 10 },
  avzHeadT: { fontSize: 12.5, fontWeight: "700", color: C.muted },
  avzChevron: { fontSize: 11, color: C.muted },
  hint: { fontSize: 11.5, color: C.muted, lineHeight: 16 },
});

const q = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 52 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: C.ink },
  close: { fontSize: 14, fontWeight: "700", color: C.primario },
  pasos: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 13, gap: 9 },
  paso: { flexDirection: "row", alignItems: "center", gap: 10 },
  pasoN: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primario, alignItems: "center", justifyContent: "center" },
  pasoNT: { color: "#fff", fontSize: 12, fontWeight: "900" },
  pasoT: { flex: 1, fontSize: 12.5, color: C.ink2, fontWeight: "600", lineHeight: 17 },
  seg: { flexDirection: "row", marginHorizontal: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: "hidden", marginBottom: 4 },
  segBtn: { flex: 1, paddingVertical: 11, alignItems: "center" },
  segOn: { backgroundColor: C.primario },
  segT: { fontSize: 12.5, fontWeight: "700", color: C.muted },
  body: { padding: 22, alignItems: "center" },
  lead: { fontSize: 14, color: C.ink2, lineHeight: 20 },
  qrCard: { backgroundColor: "#fff", padding: 22, borderRadius: 18, marginTop: 18, borderWidth: 1, borderColor: C.line },
  sub: { fontSize: 13, color: C.muted, marginTop: 12 },
  permBtn: { backgroundColor: C.primario, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 22, marginTop: 16 },
  permT: { color: "#fff", fontWeight: "800", fontSize: 15 },
  pasteInput: { alignSelf: "stretch", fontSize: 14, padding: 13, borderWidth: 1.5, borderColor: C.line, borderRadius: 11, color: C.ink, backgroundColor: C.surface, marginTop: 16 },
  scanHint: { position: "absolute", bottom: 28, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16 },
  scanHintT: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
