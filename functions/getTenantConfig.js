// functions/getTenantConfig.js
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

exports.handler = async (event) => {
  const token = event.queryStringParameters?.t;
  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Token ausente' }) };
  }
  const data = await redis.get(`monitor:${token}`);
  if (!data) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Monitor não encontrado' }) };
  }
  const { empresa } = JSON.parse(data);
  return { statusCode: 200, body: JSON.stringify({ empresa }) };
};
