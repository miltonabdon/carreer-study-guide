import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  return redis;
}
