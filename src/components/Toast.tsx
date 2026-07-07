import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { Icon } from "./Icon";
import { C } from "../theme";

type ToastKind = "success" | "error" | "info";
interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

const KIND_STYLE: Record<ToastKind, { bg: string; icon: string }> = {
  success: { bg: C.verde, icon: "check" },
  error: { bg: C.rojoD, icon: "alert" },
  info: { bg: C.slate, icon: "broadcast" },
};

const ToastCtx = createContext<(kind: ToastKind, message: string) => void>(() => {});

/** Notificación no bloqueante (reemplaza Alert.alert para confirmaciones que no requieren acción). */
export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);
  const y = useSharedValue(-80);
  const opacity = useSharedValue(0);

  const show = useCallback((kind: ToastKind, message: string) => {
    setToast({ id: ++nextId.current, kind, message });
  }, []);

  // Dispara la animación de entrada/salida desde un efecto ligado al ciclo de
  // vida de React, en vez de mutar los shared values dentro del callback async
  // que llama a show() — más confiable entre plataformas (web incluido).
  useEffect(() => {
    if (!toast) return;
    y.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 220 });
    const hide = setTimeout(() => {
      y.value = withTiming(-80, { duration: 220 });
      opacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), 220);
    }, 3200);
    return () => clearTimeout(hide);
  }, [toast?.id]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" style={[st.wrap, style]}>
          <View style={[st.card, { backgroundColor: KIND_STYLE[toast.kind].bg }]}>
            <Icon name={KIND_STYLE[toast.kind].icon} size={18} color="#fff" />
            <Text style={st.msg}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 32,
    left: 14,
    right: 14,
    zIndex: 999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  msg: { flex: 1, color: "#fff", fontSize: 13.5, fontWeight: "700" },
});
