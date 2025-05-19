// functions/cancelar.js
import { Redis } from "@upstash/redis";

export async function handler(event) {
  const { clientId } = JSON.parse(event.body || "{}");
  const redis = Redis.fromEnv();

  // Lê o número antes de remover
  const ticketNum = await redis.get(`ticket:${clientId}`);

  // Remove o ticket
  await redis.del(`ticket:${clientId}`);

  // Registra no log de cancelamentos
  const ts = Date.now();
  await redis.lpush(
    "cancelledList",
    JSON.stringify({ ticket: Number(ticketNum), ts })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ cancelled: true, ticket: Number(ticketNum), ts }),
  };
}
