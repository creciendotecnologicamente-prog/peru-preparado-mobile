import { forwardRef } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Haptic = "light" | "medium" | "success" | "warning" | "none";

function fireHaptic(kind: Haptic) {
  switch (kind) {
    case "light":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "medium":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
}

/**
 * Pressable con feedback táctil: se encoge levemente al presionar y dispara
 * una vibración corta (haptics). Úsalo en cualquier botón/tile que dispare
 * una acción importante — hace que la app se sienta "viva" al tacto.
 */
export const PressableScale = forwardRef<View, PressableProps & { haptic?: Haptic }>(
  ({ style, haptic = "light", onPress, onPressIn, onPressOut, children, ...rest }, ref) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
      <AnimatedPressable
        ref={ref}
        style={[style as any, aStyle]}
        onPressIn={(e) => {
          scale.value = withTiming(0.94, { duration: 90 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, { duration: 150 });
          onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic !== "none") fireHaptic(haptic);
          onPress?.(e);
        }}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  },
);
