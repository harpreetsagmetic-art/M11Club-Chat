import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env";

/**
 * Why Redis at all?
 *
 * Next.js API routes typically run as stateless/serverless functions — each
 * invocation can land on a different instance with its own memory, so an
 * in-process counter does not actually limit anything in production. Upstash
 * Redis gives every instance a shared counter over HTTP with no persistent
 * connection to manage, which is what makes rate limiting reliable here.
 *
 * We still ship an in-memory fallback so local development and small
 * deployments work without provisioning Redis, but it is best-effort only
 * (per-instance, resets on redeploy) and a console warning makes that clear.
 */

const redisConfig = serverEnv.redis;
const redis = redisConfig ? new Redis(redisConfig) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to an " +
      "in-memory limiter that does not work correctly across multiple " +
      "server instances. Set up Upstash Redis for production.",
  );
}

type MemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, MemoryEntry>();

function memoryLimit(key: string, max: number, windowSeconds: number) {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count += 1;

  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Sliding-ish fixed-window limiter keyed by an arbitrary string
 * (e.g. `messages:${firebaseUid}` or `auth:${clientIp}`).
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!redis) {
    return memoryLimit(key, max, windowSeconds);
  }

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}
