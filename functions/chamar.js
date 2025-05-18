// functions/chamar.js
import { Redis } from "@upstash/redis";

export async function handler() {
  const redis = Redis.fromEnv();

  // Incrementa o contador de chamadas
  const nextNumber = await redis.incr("callCounter");

  // Atualiza o número atual chamado
  await redis.set("currentCall", nextNumber);

  return {
    statusCode: 200,
    body: JSON.stringify({ called: nextNumber }),
  };
}
