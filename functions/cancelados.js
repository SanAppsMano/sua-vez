// functions/cancelados.js
import { Redis } from "@upstash/redis";

export async function handler() {
  const redis = Redis.fromEnv();
  // pega os 10 últimos cancelamentos
  const raw = await redis.lrange("cancelledList", 0, 9);
  const list = raw
    .map(s => JSON.parse(s))
    .sort((a, b) => b.ts - a.ts);
  return {
    statusCode: 200,
    body: JSON.stringify({ cancelled: list }),
  };
}
