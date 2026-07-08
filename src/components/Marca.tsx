import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from "react-native-reanimated";
import { C } from "../theme";

/**
 * Identidad visual propia de Perú Preparado: el "pulso sísmico" — un punto
 * con arcos concéntricos, como la propagación de una onda en un sismograma.
 * Se usa en la marca, el indicador de estado y el radar del mapa.
 */
export function Pulso({ size = 30, color = C.primario, animado = false }: { size?: number; color?: string; animado?: boolean }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {animado && <PulsoHalo size={size} color={color} />}
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx="24" cy="24" r="5.5" fill={color} />
        <Path d="M 33 15 A 12.7 12.7 0 0 1 33 33" stroke={color} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <Path d="M 15 15 A 12.7 12.7 0 0 0 15 33" stroke={color} strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.55" />
        <Path d="M 38.5 9.5 A 20.5 20.5 0 0 1 38.5 38.5" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3" />
      </Svg>
    </View>
  );
}

function PulsoHalo({ size, color }: { size: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) })), -1, false);
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: 0.3 * (1 - t.value),
    transform: [{ scale: 0.7 + t.value * 0.9 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color }, st]}
    />
  );
}

/** Wordmark del encabezado: pulso + nombre, sobre fondo claro. */
export function Marca({ estado }: { estado?: "calma" | "alerta" }) {
  return (
    <View style={s.row}>
      <Pulso size={34} color={estado === "alerta" ? C.alerta : C.primario} animado={estado === "alerta"} />
      <View style={{ flex: 1 }}>
        <Text style={s.nombre}>
          PERÚ <Text style={{ color: C.primario }}>PREPARADO</Text>
        </Text>
        <Text style={s.sub}>Prevención sísmica</Text>
      </View>
      {estado && (
        <View style={[s.pill, { backgroundColor: estado === "alerta" ? C.alertaSoft : C.verdeSoft }]}>
          <View style={[s.pillDot, { backgroundColor: estado === "alerta" ? C.alerta : C.verde }]} />
          <Text style={[s.pillT, { color: estado === "alerta" ? C.alerta : C.verde }]}>
            {estado === "alerta" ? "ALERTA" : "EN CALMA"}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  nombre: { fontSize: 16.5, fontWeight: "900", color: C.marino, letterSpacing: 0.6 },
  sub: { fontSize: 10.5, color: C.muted, fontWeight: "600", marginTop: 1, letterSpacing: 0.3 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillT: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
});
