// functions/entrar.js
import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";

export async function handler(event, context) {
  // DEBUG: verifique no log se as vars estão definidas
  console.log("REST_URL:", process.env.UPSTASH_REDIS_REST_URL);
  console.log("REST_TOKEN exists:", !!process.env.UPSTASH_REDIS_REST_TOKEN);

  // Cria client Upstash a partir das env vars
  const redis = Redis.fromEnv();

  try {
    // Incrementa contador de tickets
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
