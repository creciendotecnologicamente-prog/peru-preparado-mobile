import { SvgXml } from "react-native-svg";
import { ICONS } from "../lib/icons";
import { C } from "../theme";

/** Icono SVG nativo (react-native-svg). Reusa los paths de la web. */
export function Icon({ name, size = 22, color = C.ink2 }: { name: string; size?: number; color?: string }) {
  const xml =
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">` +
    (ICONS[name] ?? "") +
    "</svg>";
  return <SvgXml xml={xml} width={size} height={size} />;
}
