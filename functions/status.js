// functions/status.js
import { Redis } from "@upstash/redis";

export async function handler(event) {
  const redis = Redis.fromEnv();
  const url      = new URL(event.rawUrl);
  const tenantId = url.searchParams.get("t");
  if (!tenantId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing tenantId" }),
    };
  }

  // Prefixo comum
  const prefix = `tenant:${tenantId}:`;

  // Lê contadores isolados por tenant
  const currentCall    = Number(await redis.get(prefix + "currentCall")   || 0);
  const ticketCounter  = Number(await redis.get(prefix + "ticketCounter") || 0);
  const attendant      = (await redis.get(prefix + "currentAttendant")) || "";
  const timestamp      = Number(await redis.get(prefix + "currentCallTs")  || 0);

  return {
    statusCode: 200,
    body: JSON.stringify({
      currentCall,
      ticketCounter,
      attendant,
      timestamp
    }),
  };
}
