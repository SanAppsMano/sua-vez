// functions/chamar.js
import { Redis } from "@upstash/redis";

export async function handler(event) {
  const redis = Redis.fromEnv();

  // Pega query param “num”; se existir, força esse número
  const url    = new URL(event.rawUrl);
  const param  = url.searchParams.get("num");
  const next   = param
    ? Number(param)
    : await redis.incr("callCounter");

  // Atualiza o “currentCall” para next
  await redis.set("currentCall", next);

  return {
    statusCode: 200,
    body: JSON.stringify({ called: next }),
  };
}
