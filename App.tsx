import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StatusBar, Platform, Linking, Share, StyleSheet } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { Icon } from "./src/components/Icon";
import { Marca } from "./src/components/Marca";
import { Eew, type EewEvent } from "./src/components/Eew";
import { Inicio } from "./src/screens/Inicio";
import { Mapa } from "./src/screens/Mapa";
import { Prevencion } from "./src/screens/Prevencion";
import { Perfil } from "./src/screens/Perfil";
import { Comunicar } from "./src/screens/Comunicar";
import { fetchSismos, type Quake } from "./src/lib/usgs";
import { Onboarding } from "./src/components/Onboarding";
import { loadProfile, saveProfile, type Profile } from "./src/lib/profile";
import { loadServer, enviarReporte } from "./src/lib/server";
import { registerForPushNotifications } from "./src/lib/notifications";
import { ubicacionRapida, mapsUrl } from "./src/lib/ubicacion";
import { ToastProvider, useToast } from "./src/components/Toast";
import { PressableScale } from "./src/components/PressableScale";
import { C } from "./src/theme";

type Tab = "inicio" | "mapa" | "preparate" | "perfil";
const LIMA = { lat: -12.05, lon: -77.04 };

/** Una alerta sísmica se considera "activa" durante los 30 min posteriores. */
const ALERTA_VIGENCIA_MS = 30 * 60_000;

export interface AlertaActiva {
  ev: EewEvent;
  desde: number;
}

export type EstadoSalvo = "idle" | "enviando" | { hora: string; conUbicacion: boolean };

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("inicio");
  const [centroAbierto, setCentroAbierto] = useState(false);
  const [sismos, setSismos] = useState<Quake[]>([]);
  const [user, setUser] = useState(LIMA);
  const [geoOk, setGeoOk] = useState(false);
  const [eewEvent, setEewEvent] = useState<EewEvent | null>(null);
  const [alerta, setAlerta] = useState<AlertaActiva | null>(null);
  const [salvo, setSalvo] = useState<EstadoSalvo>("idle");
  const [monitor, setMonitor] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const lastSeen = useRef<string | null>(null);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setLoadingProfile(false);
    });
    registerForPushNotifications();
  }, []);

  // La alerta expira sola pasada su vigencia.
  useEffect(() => {
    if (!alerta) return;
    const iv = setInterval(() => {
      if (Date.now() - alerta.desde > ALERTA_VIGENCIA_MS) terminarAlerta();
    }, 30_000);
    return () => clearInterval(iv);
  }, [alerta]);

  function trigger(ev: EewEvent) {
    setEewEvent(ev);
    setAlerta({ ev, desde: Date.now() });
    setSalvo("idle");
  }

  function terminarAlerta() {
    setAlerta(null);
    setSalvo("idle");
  }

  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await fetchSismos();
      setSismos(data);
      if (data[0]) lastSeen.current = data[0].id;
    } catch {}
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function onRefresh() {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  }

  useEffect(() => {
    if (!monitor) return;
    const iv = setInterval(async () => {
      try {
        const data = await fetchSismos();
        const top = data[0];
        if (top && top.id !== lastSeen.current && top.mag >= 4.5) {
          lastSeen.current = top.id;
          setSismos(data);
          trigger({ mag: top.mag, place: top.place, lat: top.lat, lon: top.lon, time: top.time });
        }
      } catch {}
    }, 20000);
    return () => clearInterval(iv);
  }, [monitor]);

  function simular() {
    const bearing = Math.random() * 2 * Math.PI;
    const dKm = 150;
    const dLat = (dKm / 111) * Math.cos(bearing);
    const dLon = (dKm / (111 * Math.cos((user.lat * Math.PI) / 180))) * Math.sin(bearing);
    trigger({
      mag: +(5.8 + Math.random() * 1.4).toFixed(1),
      place: "Simulacro · costa central",
      lat: user.lat + dLat,
      lon: user.lon + dLon,
      time: Date.now(),
      simulado: true,
    });
  }

  /**
   * LA acción principal durante una alerta: avisa a la familia por todos los
   * canales — SMS al contacto de emergencia (suele sobrevivir cuando los
   * datos colapsan) y reporte al servidor con ubicación real. Nunca envía
   * una posición inventada: sin GPS, el mensaje va sin ubicación.
   */
  async function avisarFamilia() {
    if (salvo === "enviando") return;
    setSalvo("enviando");
    const ev = alerta?.ev ?? eewEvent;
    const coords = await ubicacionRapida();
    const ubicTxt = coords ? ` Mi ubicación: ${mapsUrl(coords.lat, coords.lon)}` : "";
    const sismoTxt = ev ? ` tras el sismo M ${ev.mag} (${ev.place})` : " tras el sismo";
    const msg = `Estoy a salvo${sismoTxt}.${ubicTxt} — enviado desde Perú Preparado`;

    // 1) Registro en el servidor (si hay internet); no bloquea el SMS.
    loadServer()
      .then((base) =>
        enviarReporte(base, {
          tipo: "a-salvo",
          nombre: profile?.nombre || undefined,
          ...(profile?.dni && /^\d{8}$/.test(profile.dni) ? { dni: profile.dni } : {}),
          ...(coords ? { ubicacion: `${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}` } : {}),
        }),
      )
      .catch(() => {});

    // 2) SMS al contacto de emergencia; sin contacto (o en web), hoja de compartir.
    const tel = profile?.contactoTel?.replace(/[^\d+]/g, "") ?? "";
    try {
      if (tel.length >= 6 && Platform.OS !== "web") {
        const sep = Platform.OS === "ios" ? "&" : "?";
        await Linking.openURL(`sms:${tel}${sep}body=${encodeURIComponent(msg)}`);
      } else {
        await Share.share({ message: msg });
      }
      confirmar(coords);
    } catch {
      // Si el SMS/Share no abre (web sandbox, o el usuario cancela), el aviso
      // igual quedó registrado en el servidor (paso 1). Confirmamos el envío:
      // la familia lo verá en Perú Te Busca aunque el SMS no haya salido.
      confirmar(coords);
    }

    function confirmar(c: { lat: number; lon: number } | null) {
      const hora = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
      setSalvo({ hora, conUbicacion: !!c });
    }
  }

  async function usarUbicacion() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setUser({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setGeoOk(true);
    } catch {}
  }

  const padTop = (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 48) + 6;

  if (loadingProfile) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }
  if (editing || !profile?.completedAt) {
    return (
      <Onboarding
        initial={profile ?? undefined}
        onFinish={(p) => {
          saveProfile(p);
          setProfile(p);
          setEditing(false);
        }}
        onClose={editing ? () => setEditing(false) : undefined}
      />
    );
  }

  const TABS: [Tab, string, string][] = [
    ["inicio", "home", "Inicio"],
    ["mapa", "map", "Mapa"],
    ["preparate", "shield", "Prepárate"],
    ["perfil", "user", "Perfil"],
  ];

  return (
    <View style={st.root}>
      <ExpoStatusBar style="dark" />

      {/* Encabezado claro con la marca propia */}
      <View style={[st.top, { paddingTop: padTop }]}>
        <Marca estado={alerta ? "alerta" : "calma"} />
      </View>

      {/* Contenido */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 34 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primario} colors={[C.primario]} />}
      >
        {centroAbierto ? (
          <Comunicar profile={profile} onBack={() => setCentroAbierto(false)} />
        ) : (
          <>
            {tab === "inicio" && (
              <Inicio
                sismos={sismos}
                user={user}
                alerta={alerta}
                salvo={salvo}
                onAvisarSalvo={avisarFamilia}
                onTerminarAlerta={terminarAlerta}
                monitor={monitor}
                setMonitor={setMonitor}
                onAbrirCentro={() => setCentroAbierto(true)}
              />
            )}
            {tab === "mapa" && <Mapa user={user} geoOk={geoOk} onUbicar={usarUbicacion} />}
            {tab === "preparate" && <Prevencion profile={profile} onSimular={simular} />}
            {tab === "perfil" && <Perfil profile={profile} onEdit={() => setEditing(true)} />}
          </>
        )}
      </ScrollView>

      {/* Navegación inferior */}
      <View style={st.bnav}>
        {TABS.map(([v, ic, lbl]) => {
          const activo = tab === v && !centroAbierto;
          return (
            <PressableScale
              key={v}
              style={st.tab}
              onPress={() => {
                setCentroAbierto(false);
                setTab(v);
              }}
            >
              <Icon name={ic} size={22} color={activo ? C.primario : C.muted} />
              <Text style={[st.tabT, { color: activo ? C.primario : C.muted }]}>{lbl}</Text>
              {activo && <View style={st.tabDot} />}
            </PressableScale>
          );
        })}
      </View>

      <Eew event={eewEvent} user={user} onClose={() => setEewEvent(null)} onAvisar={avisarFamilia} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { backgroundColor: C.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  bnav: { flexDirection: "row", backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, paddingBottom: Platform.OS === "ios" ? 22 : 8, paddingTop: 8 },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabT: { fontSize: 10, fontWeight: "700" },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primario, marginTop: 1 },
});
