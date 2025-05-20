import { Redis } from '@upstash/redis';

const redisExt = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export async function handler(event) {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { token, extraDays } = body;
  if (!token || !extraDays) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos' }) };
  }

  // Obtém TTL atual
  const ttlNow = await redisExt.ttl(`monitor:${token}`);
  if (ttlNow < 0) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Token expirado' }) };
  }

  // Aumenta TTL
  const novoTTL = ttlNow + extraDays * 24 * 60 * 60;
  await redisExt.expire(`monitor:${token}`, novoTTL);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, expiresIn: novoTTL })
  };
}
