// functions/entrar.js
import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";

export async function handler(event, context) {
  // Debug: imprima as vars no log
  console.log("REST_URL:", process.env.UPSTASH_REDIS_REST_URL);
  console.log("REST_TOKEN:", !!process.env.UPSTASH_REDIS_REST_TOKEN);

  // Cria o client HTTP; ele vai buscar as vars acima
  const redis = Redis.fromEnv();

  // Testa um comando simples
  try {
    const ticketNumber = await redis.incr("ticketCounter");
    const clientId = uuidv4();
    await redis.set(`ticket:${clientId}`, ticketNumber);

    return {
      statusCode: 200,
      body: JSON.stringify({ clientId, ticketNumber }),
    };
  } catch (e) {
    console.error("Redis error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
}
