// functions/status.js
import { Redis } from "@upstash/redis";

export async function handler() {
  const redis = Redis.fromEnv();
  const currentCall   = Number(await redis.get("currentCall")   || 0);
  const ticketCounter = Number(await redis.get("ticketCounter") || 0);
  const attendant     = await redis.get("currentAttendant")     || "";
  const timestamp     = Number(await redis.get("currentCallTs")  || 0);

  return {
    statusCode: 200,
    body: JSON.stringify({ currentCall, ticketCounter, attendant, timestamp }),
  };
}
