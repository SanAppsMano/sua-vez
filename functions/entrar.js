const { v4: uuidv4 } = require("uuid");
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

exports.handler = async () => {
  const clientId = uuidv4();
  const ticketNumber = await redis.incr("ticketCounter");
  await redis.set(`ticket:${clientId}`, ticketNumber);
  return {
    statusCode: 200,
    body: JSON.stringify({ clientId, ticketNumber }),
  };
};
