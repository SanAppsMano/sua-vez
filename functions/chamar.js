import { Redis } from "@upstash/redis";

export async function handler(event) {
  const redis = Redis.fromEnv();
  const url        = new URL(event.rawUrl);
  const paramNum   = url.searchParams.get("num");
  const paramId    = url.searchParams.get("id") || "";

  const next = paramNum ? Number(paramNum) : await redis.incr("callCounter");
  const ts   = Date.now();

  // grava chamada e identificador
  await redis.set("currentCall", next);
  await redis.set("currentCallTs", ts);
  if (paramId) {
    await redis.set("currentAttendant", paramId);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ called: next, timestamp: ts, attendant: paramId }),
  };
}
