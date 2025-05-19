// functions/cancelar.js
import { Redis } from "@upstash/redis";

export async function handler(event) {
  const { clientId } = JSON.parse(event.body || "{}");
  const redis = Redis.fromEnv();

  // lê o número antes de deletar
  const ticketNum = await redis.get(`ticket:${clientId}`);

  // remove a sessão normal
  await redis.del(`ticket:${clientId}`);

  // registra no início da lista 'cancelled' com timestamp
  const ts = Date.now();
  await redis.lpush("cancelledList", JSON.stringify({ ticket: Number(ticketNum), ts }));

  return {
    statusCode: 200,
    body: JSON.stringify({ cancelled: true, ticket: Number(ticketNum) }),
  };
}
