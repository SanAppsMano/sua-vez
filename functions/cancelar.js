
import { Redis } from "@upstash/redis";

export async function handler(event) {
  const { clientId } = JSON.parse(event.body);
  const redis = Redis.fromEnv();

  await redis.del(`ticket:${clientId}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ cancelled: true }),
  };
}
