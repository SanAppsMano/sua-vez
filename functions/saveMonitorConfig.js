import { Redis } from '@upstash/redis';

// Inicialize o cliente Redis usando variáveis de ambiente definidas no Netlify
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env_UPSTASH_REDIS_REST_TOKEN
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

  const { token, empresa, senha, trialDays } = body;
  if (!token || !empresa || !senha) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos' }) };
  }

  // Tempo de trial (em segundos). Se não vier trialDays, assume 7 dias.
  const ttl = (trialDays ?? 7) * 24 * 60 * 60;

  await redis.set(
    `monitor:${token}`,
    JSON.stringify({ empresa, senha }),
    { ex: ttl }
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, expiresIn: ttl })
  };
}
