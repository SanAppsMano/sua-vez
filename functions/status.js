
// functions/status.js
import { Redis } from "@upstash/redis";

export async function handler() {
  const redis = Redis.fromEnv();
  // Se não houver currentCall definido, retorna 0
  const current = await redis.get("currentCall") ?? 0;
  return {
    statusCode: 200,
    body: JSON.stringify({ currentCall: Number(current) }),
  };
}
