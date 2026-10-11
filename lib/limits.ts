// Cost guardrails. Three counters, checked cheapest-first, before any model call:
//   1. burst   - per visitor, short window (stops rapid-fire scripts)
//   2. ip-day  - per visitor, per UTC day
//   3. global  - everyone, per UTC day (the hard ceiling on daily spend)
// Storage: Upstash Redis REST if configured (shared across serverless instances, free tier is enough),
// otherwise in-memory (per-instance, best effort: fine for local dev, NOT a guarantee in production).
// The real backstop is the monthly spend limit set in the Anthropic Console.

export type Limits = {
  burstMax: number;
  burstWindowSec: number;
  ipDayMax: number;
  globalDayMax: number;
};

export type Verdict =
  | { ok: true }
  | { ok: false; code: "burst" | "ip_day" | "global_day" };

export interface CounterStore {
  /** Increment key, set TTL on first creation, return the new count. */
  incr(key: string, ttlSec: number): Promise<number>;
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
};

export function readLimits(env: Record<string, string | undefined>): Limits {
  return {
    burstMax: num(env.ASK_BURST_MAX, 5),
    burstWindowSec: Math.max(1, num(env.ASK_BURST_WINDOW_SEC, 600)),
    ipDayMax: num(env.ASK_IP_DAY_MAX, 15),
    globalDayMax: num(env.ASK_GLOBAL_DAY_MAX, 150),
  };
}

export class MemoryStore implements CounterStore {
  private m = new Map<string, { n: number; exp: number }>();
  constructor(private now: () => number = Date.now) {}
  async incr(key: string, ttlSec: number) {
    const t = this.now();
    if (this.m.size > 5000) {
      for (const [k, v] of this.m) if (v.exp <= t) this.m.delete(k);
    }
    const cur = this.m.get(key);
    if (!cur || cur.exp <= t) {
      this.m.set(key, { n: 1, exp: t + ttlSec * 1000 });
      return 1;
    }
    cur.n += 1;
    return cur.n;
  }
}

export class UpstashStore implements CounterStore {
  constructor(private url: string, private token: string) {}
  async incr(key: string, ttlSec: number) {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(ttlSec), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`limiter store ${res.status}`);
    const out = (await res.json()) as Array<{ result?: number }>;
    return Number(out?.[0]?.result ?? 0);
  }
}

let shared: CounterStore | undefined;
export function getStore(env: Record<string, string | undefined>): CounterStore {
  if (shared) return shared;
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  shared = url && token ? new UpstashStore(url.replace(/\/$/, ""), token) : new MemoryStore();
  return shared;
}

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function checkLimits(
  store: CounterStore,
  visitorHash: string,
  limits: Limits,
  now: number = Date.now()
): Promise<Verdict> {
  const win = Math.floor(now / (limits.burstWindowSec * 1000));
  const burst = await store.incr(`av:b:${visitorHash}:${win}`, limits.burstWindowSec * 2);
  if (burst > limits.burstMax) return { ok: false, code: "burst" };

  const day = utcDay(now);
  const ipDay = await store.incr(`av:i:${visitorHash}:${day}`, 90000);
  if (ipDay > limits.ipDayMax) return { ok: false, code: "ip_day" };

  const global = await store.incr(`av:g:${day}`, 90000);
  if (global > limits.globalDayMax) return { ok: false, code: "global_day" };

  return { ok: true };
}
