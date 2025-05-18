// functions/chamar.js
import { Redis } from "@upstash/redis";

export async function handler(event) {
  const redis = Redis.fromEnv();
  // pega query param “num”, se tiver força esse número
  const url    = new URL(event.rawUrl);
  const param  = url.searchParams.get("num");
  const next   = param ? Number(param) : await redis.incr("callCounter");
  // timestamp do evento
  const ts     = Date.now();

  // grava both
  await redis.set("currentCall", next);
  await redis.set("currentCallTs", ts);

  return {
    statusCode: 200,
    body: JSON.stringify({ called: next, timestamp: ts }),
  };
}
