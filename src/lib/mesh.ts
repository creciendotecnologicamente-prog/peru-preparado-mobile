/**
 * Red Malla — núcleo de malla para la app nativa.
 *
 * Mismo protocolo de paquetes que la web (peru-te-busca): identidad,
 * deduplicación, saltos (hops), TTL y relevo. MeshNode es agnóstico al medio;
 * los Transport mueven paquetes:
 *
 *   - RelayTransport: sala vía servidor (HTTP polling contra /api/mesh-signal
 *     de Perú Te Busca). Interopera con la web; en una red local funciona sin
 *     salida a internet.
 *   - BroadcastTransport: solo en el build web de Expo (BroadcastChannel).
 *   - QR (store-and-forward): sin transporte persistente — los mensajes se
 *     empaquetan en un QR y otro teléfono los ingiere al escanear, 100% sin
 *     internet. Ver encodeMeshQR / decodeMeshQR + MeshNode.ingest.
 *
 * Bluetooth LE: no existe módulo oficial en Expo SDK (verificado docs v56);
 * requerirá development build con módulo nativo. El diseño de Transport deja
 * ese enchufe listo.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export function rid(): string {
  try {
    return (globalThis as any).crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

export type Packet =
  | { t: "hello"; id: string; name: string }
  | {
      t: "msg";
      id: string;
      fromId: string;
      fromName: string;
      text: string;
      kind: string;
      hops: number;
      ttl: number;
      ts: number;
      /** DNI del emisor (opcional): permite que la familia lo reconozca. */
      dni?: string;
      /** Ubicación del emisor (opcional, solo en safe/sos con GPS real). */
      lat?: number;
      lon?: number;
    };

type MsgPacket = Extract<Packet, { t: "msg" }>;

export interface MeshMessage {
  id: string;
  fromId: string;
  fromName: string;
  text: string;
  kind: string;
  hops: number;
  ttl: number;
  ts: number;
  mine: boolean;
  dni?: string;
  lat?: number;
  lon?: number;
}

export interface Transport {
  name: string;
  start(onPacket: (p: Packet) => void): void;
  send(p: Packet): void;
  stop(): void;
}

function toMsg(p: MsgPacket, mine: boolean): MeshMessage {
  return { id: p.id, fromId: p.fromId, fromName: p.fromName, text: p.text, kind: p.kind, hops: p.hops, ttl: p.ttl, ts: p.ts, mine, dni: p.dni, lat: p.lat, lon: p.lon };
}

// ---------- Transporte local (solo build web de Expo) ----------
export class BroadcastTransport implements Transport {
  name = "local";
  private ch: any = null;
  static disponible(): boolean {
    return typeof (globalThis as any).BroadcastChannel !== "undefined";
  }
  start(onPacket: (p: Packet) => void) {
    if (!BroadcastTransport.disponible()) return;
    this.ch = new (globalThis as any).BroadcastChannel("peru_mesh_v2");
    this.ch.onmessage = (e: { data: Packet }) => onPacket(e.data);
  }
  send(p: Packet) {
    this.ch?.postMessage(p);
  }
  stop() {
    this.ch?.close();
    this.ch = null;
  }
}

// ---------- Transporte de sala (servidor Perú Te Busca) ----------
export class RelayTransport implements Transport {
  name = "sala";
  private onPacket!: (p: Packet) => void;
  private alive = true;
  private since = 0;
  /** true = último poll respondió; false = sin conexión con el servidor. */
  onStatus?: (ok: boolean) => void;

  constructor(private base: string, private room: string, private id: string) {}

  start(onPacket: (p: Packet) => void) {
    this.onPacket = onPacket;
    this.loop();
  }

  private async call(body: Record<string, unknown>): Promise<any | null> {
    try {
      const r = await fetch(`${this.base}/api/mesh-signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  private async loop() {
    while (this.alive) {
      const res = await this.call({ action: "recv", room: this.room, from: this.id, since: this.since });
      if (res?.ok) {
        this.since = res.seq ?? this.since;
        for (const p of res.pkts ?? []) {
          try {
            this.onPacket(p as Packet);
          } catch {}
        }
      }
      this.onStatus?.(!!res?.ok);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  send(p: Packet) {
    if (!this.alive) return;
    this.call({ action: "send", room: this.room, from: this.id, pkt: p });
  }

  stop() {
    this.alive = false;
  }
}

// ---------- Relevo por QR (sin internet) ----------
const QR_PREFIX = "PPM1:"; // Perú Preparado · Malla v1
const QR_MAX = 8; // mensajes por QR (límite práctico de densidad)

/** Empaqueta los mensajes más recientes en el texto de un QR. */
export function encodeMeshQR(messages: MeshMessage[]): string {
  const pk = messages.slice(0, QR_MAX).map((m) => ({
    i: m.id,
    f: m.fromId,
    n: m.fromName,
    x: m.text,
    k: m.kind,
    h: m.hops,
    l: m.ttl,
    s: m.ts,
    ...(m.dni ? { d: m.dni } : {}),
    ...(Number.isFinite(m.lat) && Number.isFinite(m.lon) ? { a: m.lat, o: m.lon } : {}),
  }));
  return QR_PREFIX + JSON.stringify(pk);
}

/** Decodifica un QR de malla. Devuelve null si no es válido. */
export function decodeMeshQR(raw: string): MsgPacket[] | null {
  if (!raw || !raw.startsWith(QR_PREFIX)) return null;
  try {
    const arr = JSON.parse(raw.slice(QR_PREFIX.length));
    if (!Array.isArray(arr)) return null;
    return arr
      .filter((o) => o && typeof o.i === "string" && typeof o.x === "string")
      .map((o) => ({
        t: "msg" as const,
        id: o.i,
        fromId: String(o.f ?? ""),
        fromName: String(o.n ?? "—"),
        text: String(o.x),
        kind: String(o.k ?? "texto"),
        hops: Number(o.h) || 0,
        ttl: Math.max(0, Number(o.l) || 0),
        ts: Number(o.s) || Date.now(),
        ...(o.d ? { dni: String(o.d) } : {}),
        ...(Number.isFinite(Number(o.a)) && Number.isFinite(Number(o.o)) ? { lat: Number(o.a), lon: Number(o.o) } : {}),
      }));
  } catch {
    return null;
  }
}

// ---------- Nodo de malla ----------
export class MeshNode {
  private seen = new Map<string, number>();
  private transports: Transport[] = [];
  peers = new Map<string, { name: string; last: number }>();
  messages: MeshMessage[] = [];
  onChange?: () => void;
  private hb: ReturnType<typeof setInterval> | null = null;

  constructor(public id: string, public name: string) {}

  addTransport(t: Transport) {
    this.transports.push(t);
    t.start((p) => this.receive(p));
  }

  removeTransport(t: Transport) {
    t.stop();
    this.transports = this.transports.filter((x) => x !== t);
  }

  start() {
    this.hello();
    this.hb = setInterval(() => {
      this.hello();
      this.prune();
    }, 4000);
  }

  stop() {
    if (this.hb) clearInterval(this.hb);
    this.transports.forEach((t) => t.stop());
    this.transports = [];
  }

  /** Restaura historial persistido (marca los ids como vistos). */
  seed(messages: MeshMessage[]) {
    this.messages = messages;
    const now = Date.now();
    for (const m of messages) this.seen.set(m.id, now);
  }

  private bcast(p: Packet) {
    this.transports.forEach((t) => t.send(p));
  }
  private hello() {
    this.bcast({ t: "hello", id: this.id, name: this.name });
  }
  private emit() {
    this.onChange?.();
  }

  send(text: string, kind = "texto", extra?: { dni?: string; lat?: number; lon?: number }) {
    if (!text.trim()) return;
    const m: MsgPacket = {
      t: "msg",
      id: rid(),
      fromId: this.id,
      fromName: this.name,
      text: text.trim(),
      kind,
      hops: 0,
      ttl: 6,
      ts: Date.now(),
      ...(extra?.dni ? { dni: extra.dni } : {}),
      ...(Number.isFinite(extra?.lat) && Number.isFinite(extra?.lon) ? { lat: extra!.lat, lon: extra!.lon } : {}),
    };
    this.seen.set(m.id, Date.now());
    this.messages.unshift(toMsg(m, true));
    this.bcast(m);
    this.emit();
  }

  /** Ingiere paquetes llegados fuera de un transporte (p. ej. QR escaneado). */
  ingest(pkts: Packet[]): number {
    let nuevos = 0;
    for (const p of pkts) {
      if (p.t === "msg" && !this.seen.has(p.id)) nuevos++;
      this.receive(p);
    }
    return nuevos;
  }

  receive(p: Packet) {
    if (p.t === "hello") {
      if (p.id !== this.id) {
        this.peers.set(p.id, { name: p.name, last: Date.now() });
        this.emit();
      }
      return;
    }
    if (p.t === "msg") {
      if (this.seen.has(p.id)) return; // deduplicación
      this.seen.set(p.id, Date.now());
      if (p.fromId !== this.id) {
        this.messages.unshift(toMsg(p, false));
        this.emit();
      }
      if (p.ttl > 0) this.bcast({ ...p, hops: p.hops + 1, ttl: p.ttl - 1 }); // relevo
    }
  }

  private prune() {
    const now = Date.now();
    let changed = false;
    for (const [k, t] of this.seen) if (now - t > 5 * 60_000) this.seen.delete(k);
    for (const [k, v] of this.peers)
      if (now - v.last > 12_000) {
        this.peers.delete(k);
        changed = true;
      }
    if (changed) this.emit();
  }
}

// ---------- Persistencia ----------
const K = {
  id: "pp_mesh_id",
  name: "pp_mesh_name",
  msgs: "pp_mesh_msgs",
  server: "pp_mesh_server",
  room: "pp_mesh_room",
};

export interface MeshState {
  id: string;
  name: string;
  messages: MeshMessage[];
  server: string;
  room: string;
}

export async function loadMeshState(defaultName: string, defaultServer: string): Promise<MeshState> {
  try {
    const [id, name, msgs, server, room] = await Promise.all([
      AsyncStorage.getItem(K.id),
      AsyncStorage.getItem(K.name),
      AsyncStorage.getItem(K.msgs),
      AsyncStorage.getItem(K.server),
      AsyncStorage.getItem(K.room),
    ]);
    const finalId = id || rid();
    if (!id) AsyncStorage.setItem(K.id, finalId).catch(() => {});
    return {
      id: finalId,
      name: name || defaultName,
      messages: msgs ? (JSON.parse(msgs) as MeshMessage[]) : [],
      server: server ?? defaultServer,
      room: room || "PERU",
    };
  } catch {
    return { id: rid(), name: defaultName, messages: [], server: defaultServer, room: "PERU" };
  }
}

export function saveMeshName(name: string) {
  AsyncStorage.setItem(K.name, name).catch(() => {});
}
export function saveMeshMsgs(messages: MeshMessage[]) {
  AsyncStorage.setItem(K.msgs, JSON.stringify(messages.slice(0, 60))).catch(() => {});
}
export function saveMeshServer(server: string) {
  AsyncStorage.setItem(K.server, server).catch(() => {});
}
export function saveMeshRoom(room: string) {
  AsyncStorage.setItem(K.room, room).catch(() => {});
}
