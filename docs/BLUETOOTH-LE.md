# Red Malla por Bluetooth LE — diseño técnico

Estado: **diseño listo, pendiente de development build**. Verificado contra las
docs de Expo (SDK 54 instalado y SDK 56, la última): **no existe módulo oficial
de Bluetooth ni de conexiones cercanas**, por lo que esto no puede correr en
Expo Go. Requiere `expo-dev-client` + módulos nativos y compilar con EAS.

El núcleo de malla ([src/lib/mesh.ts](../src/lib/mesh.ts)) ya es agnóstico al
medio: BLE es solo un `Transport` más. Nada del protocolo (dedup, TTL, saltos,
hello) cambia.

## Por qué no basta una sola librería

Para que dos teléfonos se hablen sin infraestructura, cada uno debe ser a la
vez **central** (escanear y conectarse) y **periférico** (anunciarse y aceptar
escrituras GATT):

| Rol | Librería | Estado |
|---|---|---|
| Central (scan + connect + write) | `react-native-ble-plx` | Madura, con config plugin de Expo |
| Periférico Android (advertise + GATT server) | `react-native-ble-advertiser` o módulo propio (BluetoothGattServer) | Funciona; API vieja |
| Periférico iOS (CBPeripheralManager) | **Módulo Expo propio** (no hay librería mantenida) | Por escribir |

Recomendación: un módulo Expo pequeño (`npx create-expo-module pp-ble-peripheral`)
que exponga `startAdvertising(serviceUUID)`, `onWrite(callback)` y
`stopAdvertising()` sobre CBPeripheralManager (iOS) y BluetoothGattServer
(Android). Central siempre con `react-native-ble-plx`.

## Protocolo BLE

- **Service UUID**: `7e5e0000-b5a3-f393-e0a9-e50e24dcca9e` (Perú Preparado Mesh)
- **Característica TX**: `7e5e0001-…` — write-without-response. Un nodo central
  escribe paquetes aquí cuando visita a un periférico.
- **Paquete**: el mismo JSON de `Packet` de mesh.ts, UTF-8.
- **Chunking**: MTU típico seguro = 185 bytes. Paquetes mayores se parten:
  cabecera de 4 bytes `[msgSeq, chunkIdx, chunkTotal, flags]` + payload.
  El receptor rearma y pasa el JSON completo a `MeshNode.receive()`.
- **Ciclo**: cada nodo alterna anuncio (siempre activo) y escaneo (ventanas de
  10 s cada 30 s para ahorrar batería). Al descubrir un peer: conectar,
  escribir los N paquetes recientes no confirmados, desconectar. La
  deduplicación del núcleo absorbe reenvíos.

## Esqueleto del transporte

```ts
// src/lib/ble.ts — requiere dev build; NO importar en Expo Go.
import { BleManager } from "react-native-ble-plx";
import PpBlePeripheral from "pp-ble-peripheral"; // módulo propio
import type { Packet, Transport } from "./mesh";

const SERVICE = "7e5e0000-b5a3-f393-e0a9-e50e24dcca9e";
const TX_CHAR = "7e5e0001-b5a3-f393-e0a9-e50e24dcca9e";

export class BleTransport implements Transport {
  name = "ble";
  private manager = new BleManager();
  private onPacket!: (p: Packet) => void;
  private pendientes: Packet[] = [];

  start(onPacket: (p: Packet) => void) {
    this.onPacket = onPacket;
    PpBlePeripheral.startAdvertising(SERVICE);
    PpBlePeripheral.onWrite((bytes: Uint8Array) => this.rearmar(bytes));
    this.escanearPeriodicamente();
  }

  send(p: Packet) {
    this.pendientes.push(p);            // se entregan al próximo encuentro
    this.pendientes = this.pendientes.slice(-30);
  }

  private escanearPeriodicamente() { /* scan SERVICE → connect →
    escribir this.pendientes en TX_CHAR (chunked) → disconnect */ }

  private rearmar(bytes: Uint8Array) { /* rearmar chunks → JSON.parse →
    this.onPacket(pkt) — el núcleo deduplica y releva */ }

  stop() {
    PpBlePeripheral.stopAdvertising();
    this.manager.destroy();
  }
}
```

Integración en la UI: en `RedMalla.tsx`, detrás de una guarda de disponibilidad
(`Constants.appOwnership !== "expo"`), añadir el transporte:
`node.addTransport(new BleTransport())`.

## Pasos de build

1. `npx expo install expo-dev-client react-native-ble-plx`
2. Crear el módulo periférico: `npx create-expo-module pp-ble-peripheral`
3. `app.json` → plugins:
   ```json
   ["react-native-ble-plx", {
     "isBackgroundEnabled": true,
     "modes": ["peripheral", "central"],
     "bluetoothAlwaysPermission": "Perú Preparado usa Bluetooth para comunicarte con otros teléfonos cercanos cuando no hay internet."
   }]
   ```
   (añade `NSBluetoothAlwaysUsageDescription` en iOS y `BLUETOOTH_SCAN/ADVERTISE/CONNECT` en Android)
4. `eas build --profile development --platform android` (y luego iOS)
5. Probar con dos teléfonos físicos en modo avión: enviar "Estoy a salvo" en
   uno y verificar llegada + relevo en el otro.

## Mientras tanto

El relevo por QR ya cubre el caso 100 % sin internet (store-and-forward de mano
en mano), y la sala vía servidor cubre LAN/internet. BLE añadirá el salto
automático de fondo entre desconocidos cercanos — la pieza que convierte esto
en una malla urbana real tras un sismo.
