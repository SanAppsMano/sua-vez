
import { Redis } from "@upstash/redis";

export async function handler() {
  const redis = Redis.fromEnv();
  const next = await redis.incr("callCounter");
  await redis.set("currentCall", next);
  return {
    statusCode: 200,
    body: JSON.stringify({ called: next }),
  };
}
