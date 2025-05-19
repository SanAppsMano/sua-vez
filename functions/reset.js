import { Redis } from '@upstash/redis';

export async function handler() {
  const redis = Redis.fromEnv();
  await redis.set('ticketCounter', 0);
  await redis.set('callCounter',  0);
  await redis.set('currentCall',  0);
  await redis.set('currentCallTs', Date.now());
  await redis.del('currentAttendant');
  return { statusCode: 200, body: JSON.stringify({ reset: true }) };
}
