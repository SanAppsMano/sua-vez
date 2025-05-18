// functions/cancelar.js
import { Redis } from "@upstash/redis";

export async function handler(event) {
  // O body virá como JSON: { clientId: "…" }
  const { clientId } = JSON.parse(event.body || "{}");
  const redis = Redis.fromEnv();

  // Remove o ticket daquele clientId
  await redis.del(`ticket:${clientId}`);

  return {
    statusCode: 200,
    body: JSON.stringify({ cancelled: true }),
  };
}
