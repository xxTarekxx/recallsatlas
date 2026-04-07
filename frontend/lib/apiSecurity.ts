import { NextResponse } from "next/server";

/**
 * App-layer rate limits (per IP, in-memory sliding window).
 * - Prefer Cloudflare WAF / Rate Limiting rules on /api/* as the first line of defense.
 * - Behind Cloudflare, `cf-connecting-ip` is used when present.
 * - Multi-instance / serverless: each process has its own counters; add Upstash Redis or CF rules for shared limits.
 * - Local / load tests: set DISABLE_API_RATE_LIMIT=1 to bypass (never in production).
 */

/** Max JSON body for /api/cars/* POST (protects against huge payloads). */
export const MAX_JSON_BODY_BYTES = 24_576;

type LimitConfig = { max: number; windowMs: number };

/** Per-route limits (per IP, sliding window). Tune via env if needed. */
const ROUTES: Record<string, LimitConfig> = {
  "cars-lookup": {
    max: Math.max(1, parseInt(process.env.RATE_LIMIT_CARS_LOOKUP_MAX || "40", 10) || 40),
    windowMs: 60_000,
  },
  "cars-translate": {
    max: Math.max(1, parseInt(process.env.RATE_LIMIT_CARS_TRANSLATE_MAX || "24", 10) || 24),
    windowMs: 60_000,
  },
  "recalls-suggest": {
    max: Math.max(1, parseInt(process.env.RATE_LIMIT_RECALLS_SUGGEST_MAX || "100", 10) || 100),
    windowMs: 60_000,
  },
  "recalls-list": {
    max: Math.max(1, parseInt(process.env.RATE_LIMIT_RECALLS_LIST_MAX || "150", 10) || 150),
    windowMs: 60_000,
  },
  "recalls-json": {
    max: Math.max(1, parseInt(process.env.RATE_LIMIT_RECALLS_JSON_MAX || "12", 10) || 12),
    windowMs: 60_000,
  },
  "general-recalls-list": {
    max: Math.max(1, parseInt(process.env.RATE_LIMIT_GENERAL_RECALLS_LIST_MAX || "150", 10) || 150),
    windowMs: 60_000,
  },
  "general-recalls-suggest": {
    max: Math.max(1, parseInt(process.env.RATE_LIMIT_GENERAL_RECALLS_SUGGEST_MAX || "100", 10) || 100),
    windowMs: 60_000,
  },
};

const DEFAULT_API: LimitConfig = {
  max: Math.max(1, parseInt(process.env.RATE_LIMIT_DEFAULT_MAX || "200", 10) || 200),
  windowMs: 60_000,
};

const hits = new Map<string, number[]>();
const SWEEP_THRESHOLD = 25_000;

function pruneWindow(timestamps: number[], now: number, windowMs: number) {
  const cut = now - windowMs;
  return timestamps.filter((t) => t > cut);
}

function sweepStale(now: number) {
  const globalCut = now - 120_000;
  hits.forEach((ts, k) => {
    const kept = ts.filter((t) => t > globalCut);
    if (kept.length === 0) hits.delete(k);
    else hits.set(k, kept);
  });
}

/**
 * Best client IP behind Cloudflare / reverse proxies.
 * Prefer CF-Connecting-IP; never trust client-supplied spoofed headers alone when CF is off.
 */
export function getClientIp(req: Request): string {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim().slice(0, 64);
  const trueClient = h.get("true-client-ip");
  if (trueClient?.trim()) return trueClient.trim().slice(0, 64);
  const realIp = h.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim().slice(0, 64);
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return "unknown";
}

export function consumeRateLimit(
  routeId: string,
  ip: string
): { ok: boolean; retryAfterSec: number; remaining: number } {
  const cfg = ROUTES[routeId] ?? DEFAULT_API;
  const key = `${routeId}:${ip}`;
  const now = Date.now();
  let arr = hits.get(key) ?? [];
  arr = pruneWindow(arr, now, cfg.windowMs);

  if (arr.length >= cfg.max) {
    const oldest = arr[0]!;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + cfg.windowMs - now) / 1000));
    hits.set(key, arr);
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  arr.push(now);
  hits.set(key, arr);

  if (hits.size > SWEEP_THRESHOLD) {
    sweepStale(now);
  }

  return { ok: true, retryAfterSec: 0, remaining: cfg.max - arr.length };
}

export function rateLimitExceededResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    }
  );
}

/** Returns 429 NextResponse if over limit; otherwise null. */
export function enforceRateLimit(req: Request, routeId: string): NextResponse | null {
  if (process.env.DISABLE_API_RATE_LIMIT === "1") {
    return null;
  }
  const ip = getClientIp(req);
  const { ok, retryAfterSec } = consumeRateLimit(routeId, ip);
  if (!ok) return rateLimitExceededResponse(retryAfterSec);
  return null;
}

export function jsonBodyTooLarge(req: Request, maxBytes = MAX_JSON_BODY_BYTES): boolean {
  const cl = req.headers.get("content-length");
  if (!cl) return false;
  const n = parseInt(cl, 10);
  return Number.isFinite(n) && n > maxBytes;
}

export function payloadTooLargeResponse(): NextResponse {
  return NextResponse.json(
    { error: "Request body too large." },
    { status: 413, headers: { "Cache-Control": "no-store" } }
  );
}
