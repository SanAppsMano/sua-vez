import { Redis } from "@upstash/redis";

export async function handler(event) {
  const url      = new URL(event.rawUrl);
  const tenantId = url.searchParams.get("t");
  if (!tenantId) {
    return { statusCode: 400, body: "Missing tenantId" };
  }

  const redis  = Redis.fromEnv();
  const prefix = `tenant:${tenantId}:`;

  // Últimos 50 cancelamentos
  const raw = await redis.lrange(prefix + "log:cancelled", 0, 49);
  const list = raw.map(s => JSON.parse(s)).sort((a, b) => b.ts - a.ts);

  return {
    statusCode: 200,
    body: JSON.stringify({ cancelled: list }),
  };
}
