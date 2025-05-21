// functions/getTenantConfig.js
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

exports.handler = async (event) => {
  // 1) Recupera token via query string
  const token = event.queryStringParameters?.t;
  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Token ausente' })
    };
  }

  try {
    // 2) Busca dados do monitor
    const data = await redis.get(`monitor:${token}`);
    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Monitor não encontrado' })
      };
    }

    // 3) Extrai e devolve só o nome da empresa
    const { empresa } = JSON.parse(data);
    return {
      statusCode: 200,
      body: JSON.stringify({ empresa })
    };
  } catch (err) {
    console.error('Erro getTenantConfig:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
