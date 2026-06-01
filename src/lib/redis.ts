let redisClient: any = null;
let inMemoryCache: Map<string, { value: string; expiresAt: number }> | null = null;

const REDIS_URL = process.env.REDIS_URL || process.env.NEXT_PUBLIC_REDIS_URL;

if (REDIS_URL) {
  try {
    // Lazy require to avoid crashing when not installed in environments without Redis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis');
    redisClient = new IORedis(REDIS_URL);
  } catch (e) {
    console.warn('ioredis not available, falling back to in-memory cache', e?.message || e);
    inMemoryCache = new Map();
  }
} else {
  // Local in-memory fallback for dev
  inMemoryCache = new Map();
}

const now = () => Date.now();

export async function redisGet(key: string): Promise<string | null> {
  if (redisClient) {
    try {
      const res = await redisClient.get(key);
      return res;
    } catch (e) {
      console.warn('redis get failed, fallback to memory', e?.message || e);
    }
  }

  if (inMemoryCache) {
    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < now()) {
      inMemoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  return null;
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (redisClient) {
    try {
      if (ttlSeconds) await redisClient.set(key, value, 'EX', ttlSeconds);
      else await redisClient.set(key, value);
      return;
    } catch (e) {
      console.warn('redis set failed, fallback to memory', e?.message || e);
    }
  }

  if (inMemoryCache) {
    const expiresAt = ttlSeconds ? now() + ttlSeconds * 1000 : Infinity;
    inMemoryCache.set(key, { value, expiresAt });
  }
}

export async function redisDel(key: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (e) {
      console.warn('redis del failed, fallback to memory', e?.message || e);
    }
  }

  if (inMemoryCache) {
    inMemoryCache.delete(key);
  }
}

export function isRedisEnabled() {
  return !!redisClient;
}
