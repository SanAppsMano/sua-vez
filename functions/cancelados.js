// functions/cancelados.js
import { Redis } from "@upstash/redis";

export async function handler() {
  const redis = Redis.fromEnv();
  // pega até os 10 últimos cancelamentos
  const raw = await redis.lrange("cancelledList", 0, 9);
  // parseia e ordena por ts descendente
  const list = raw
    .map(str => JSON.parse(str))
    .sort((a, b) => b.ts - a.ts);
  return {
    statusCode: 200,
    body: JSON.stringify({ cancelled: list }),
  };
}
