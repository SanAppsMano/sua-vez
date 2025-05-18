import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";

// Cria o client HTTP lendo das env vars
const redis = Redis.fromEnv();

export async function handler(event, context) {
  // Gera clientId e incrementa contador atômico
  const clientId     = uuidv4();
  const ticketNumber = await redis.incr("ticketCounter");
  await redis.set(`ticket:${clientId}`, ticketNumber);

  return {
    statusCode: 200,
    body: JSON.stringify({ clientId, ticketNumber }),
  };
}
