import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, StatusBar, Platform, Alert, StyleSheet } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { Icon } from "./src/components/Icon";
import { Eew, type EewEvent } from "./src/components/Eew";
import { Inicio } from "./src/screens/Inicio";
import { Informacion } from "./src/screens/Informacion";
import { Prevencion } from "./src/screens/Prevencion";
import { Comunicar } from "./src/screens/Comunicar";
import { fetchSismos, type Quake } from "./src/lib/usgs";
import { Onboarding } from "./src/components/Onboarding";
import { loadProfile, saveProfile, type Profile } from "./src/lib/profile";
import { loadServer, enviarReporte } from "./src/lib/server";
import { registerForPushNotifications } from "./src/lib/notifications";
import { ToastProvider, useToast } from "./src/components/Toast";
import { C } from "./src/theme";

type View2 = "inicio" | "prevencion" | "informacion" | "comunicar";
const LIMA = { lat: -12.05, lon: -77.04 };

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const toast = useToast();
  const [view, setView] = useState<View2>("inicio");
  const [sismos, setSismos] = useState<Quake[]>([]);
  const [user, setUser] = useState(LIMA);
  const [geoOk, setGeoOk] = useState(false);
  const [eewEvent, setEewEvent] = useState<EewEvent | null>(null);
  const [monitor, setMonitor] = useState(false);
  const [alertas, setAlertas] = useState<{ id: string; tipo: string; msg: string; nivel: string }[]>([]);
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

  function trigger(ev: EewEvent, nivel = "rojo") {
    setEewEvent(ev);
    setAlertas((a) =>
      [{ id: Math.random().toString(36).slice(2), tipo: ev.simulado ? "Simulacro" : "Sismo", msg: `M ${ev.mag} · ${ev.place}`, nivel }, ...a].slice(0, 5),
    );
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
          trigger({ mag: top.mag, place: top.place, lat: top.lat, lon: top.lon, time: top.time }, "rojo");
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
    trigger(
      {
        mag: +(5.8 + Math.random() * 1.4).toFixed(1),
        place: "Simulacro · costa central",
        lat: user.lat + dLat,
        lon: user.lon + dLon,
        time: Date.now(),
        simulado: true,
      },
      "amarillo",
    );
  }

  function onReportar() {
    setView("comunicar");
  }
  async function onSafe() {
    try {
      const base = await loadServer();
      await enviarReporte(base, {
        tipo: "a-salvo",
        nombre: profile?.nombre || undefined,
        ...(profile?.dni && /^\d{8}$/.test(profile.dni) ? { dni: profile.dni } : {}),
      });
      toast("success", "Tu aviso “estoy a salvo” quedó registrado. ¡Gracias!");
    } catch {
      Alert.alert("Sin conexión", "No se pudo avisar al servidor. Usa la Red Malla (pestaña Comunicar) para avisar sin internet.");
    }
  }
  function onBuscar() {
    setView("comunicar");
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

  const padTop = (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 48) + 4;

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

  return (
    <View style={st.root}>
      <ExpoStatusBar style="light" />
      {/* Barra superior */}
      <View style={[st.top, { paddingTop: padTop }]}>
        <View style={st.mk}>
          <Icon name="shield" size={21} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={st.h1}>Perú Preparado</Text>
            <View style={st.beta}><Text style={st.betaT}>BETA</Text></View>
          </View>
          <Pressable onPress={usarUbicacion}>
            <Text style={st.loc}>{geoOk ? "Tu ubicación" : "Lima · toca para ubicarte"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Contenido */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.rojo} colors={[C.rojo]} />}
      >
        {view === "inicio" && (
          <Inicio
            sismos={sismos}
            user={user}
            monitor={monitor}
            setMonitor={setMonitor}
            onSimular={simular}
            goTo={setView}
            onReportar={onReportar}
            onSafe={onSafe}
            onBuscar={onBuscar}
            alertas={alertas}
          />
        )}
        {view === "prevencion" && <Prevencion profile={profile} onEdit={() => setEditing(true)} />}
        {view === "informacion" && <Informacion sismos={sismos} />}
        {view === "comunicar" && <Comunicar profile={profile} />}
      </ScrollView>

      {/* Navegación inferior */}
      <View style={st.bnav}>
        {([
          ["inicio", "home", "Inicio"],
          ["prevencion", "shield", "Prevención"],
          ["informacion", "broadcast", "Info"],
          ["comunicar", "message", "Comunicar"],
        ] as [View2, string, string][]).map(([v, ic, lbl]) => (
          <Pressable key={v} style={st.tab} onPress={() => setView(v)}>
            <Icon name={ic} size={22} color={view === v ? C.rojo : C.muted} />
            <Text style={[st.tabT, { color: view === v ? C.rojo : C.muted }]}>{lbl}</Text>
          </Pressable>
        ))}
      </View>

      <Eew event={eewEvent} user={user} onClose={() => setEewEvent(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { backgroundColor: C.rojo, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 15, paddingBottom: 11 },
  mk: { width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  h1: { color: "#fff", fontSize: 17, fontWeight: "800" },
  beta: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  betaT: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  loc: { color: "#fff", opacity: 0.95, fontSize: 11, marginTop: 2 },
  bnav: { flexDirection: "row", backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, paddingBottom: Platform.OS === "ios" ? 22 : 6, paddingTop: 6 },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabT: { fontSize: 10, fontWeight: "700" },
});
