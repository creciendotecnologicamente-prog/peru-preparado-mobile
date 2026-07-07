import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadServer } from "./server";

// Muestra la notificación incluso si la app está en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  // Solo funciona en dispositivos físicos (no en simulador ni en web).
  if (!Device.isDevice || Platform.OS === "web") return;

  // El desarrollo en Expo Go (SDK 53+) no soporta push remoto.
  // Funciona con `npx expo run:android` / `eas build --profile development`.
  if (Constants.appOwnership === "expo") {
    console.log("[push] Expo Go detectado: push remoto no disponible. Usa un dev build.");
    return;
  }

  // Crear canal de notificaciones en Android.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("sismos", {
      name: "Alertas sísmicas",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C0392B",
      sound: "default",
    });
  }

  // Pedir permiso.
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  // Obtener token de push de Expo.
  // projectId se agrega automáticamente a app.json cuando ejecutas `npx eas init`.
  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.log("[push] Sin EAS projectId: ejecuta `npx eas init` para habilitarlo.");
    return;
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (e) {
    console.log("[push] No se pudo obtener token:", e);
    return;
  }

  // Registrar el token en el servidor.
  const base = await loadServer();
  try {
    await fetch(`${base}/api/push-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    console.log("[push] Token registrado en el servidor.");
  } catch {
    // Sin conexión al arrancar: no es crítico, se reintentará en el próximo inicio.
  }
}

// Desregistrar el token (útil si el usuario quiere dejar de recibir alertas).
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const result = await Notifications.getExpoPushTokenAsync();
    const base = await loadServer();
    await fetch(`${base}/api/push-tokens`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: result.data }),
    });
  } catch {}
}
