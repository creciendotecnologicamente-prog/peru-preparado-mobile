# Alertas push — diseño técnico

Estado: **diseño listo, pendiente de backend desplegado**. El monitor actual
(polling IGP+USGS cada 20 s) solo funciona con la app abierta; una alerta
sísmica útil debe llegar con la app cerrada, y eso exige empujar desde un
servidor.

## Arquitectura

```
IGP + USGS ──► Watcher (servicio en el server Perú Te Busca)
                  │  detecta evento nuevo M≥umbral
                  ▼
            Expo Push API ──► APNs / FCM ──► teléfonos registrados
```

1. **Registro**: la app pide permiso y obtiene su token con
   `expo-notifications` (`getExpoPushTokenAsync`), y lo envía a un endpoint
   nuevo `POST /api/push-tokens` junto con su región/ubicación aproximada
   (para filtrar por cercanía al epicentro).
2. **Watcher**: un proceso en el servidor (cron cada 15–30 s sobre las mismas
   fuentes IGP/USGS ya integradas en `/api/sismos`) detecta eventos nuevos.
   Reutiliza la deduplicación existente; guarda el último id notificado.
3. **Envío**: para cada evento M≥4.5, POST a `https://exp.host/--/api/v2/push/send`
   con lotes de hasta 100 tokens, priorizando los dispositivos a <500 km del
   epicentro (haversine ya está en `src/lib/geo.ts` de ambos proyectos).

## Requisitos que hoy no se cumplen (por eso está pendiente)

- **Servidor desplegado 24/7** — el watcher no puede vivir en el laptop de
  desarrollo. Depende del bloque de infraestructura (apartado).
- **Development build o build de producción** — desde SDK 53, las
  notificaciones remotas NO funcionan en Expo Go (Android). Igual que BLE,
  cae en el mismo development build (ver [BLUETOOTH-LE.md](./BLUETOOTH-LE.md)).
- **Credenciales**: FCM (google-services.json) y APNs key vía EAS.

## Pasos cuando se despliegue

1. `npx expo install expo-notifications expo-device`
2. Endpoint `POST /api/push-tokens` en peru-te-busca-next (mismo patrón de
   store con respaldo en disco que `src/lib/reportes.ts`).
3. Watcher: en Next puede ser una ruta `GET /api/watch` invocada por cron
   externo (Cloudflare Cron Triggers / GitHub Actions cada minuto), o un
   worker aparte si se usa contenedor.
4. Probar con `expo push:send` manual antes de automatizar.

## Nota honesta sobre latencia

Esto notifica **después** de que IGP/USGS publican (decenas de segundos a
minutos tras el sismo): sirve como aviso informativo y para activar protocolos
familiares, NO como alerta temprana de segundos. La alerta anticipada real
requiere el feed de baja latencia del SASPe (convenio con IGP).
