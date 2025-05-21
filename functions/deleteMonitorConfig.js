// functions/deleteMonitorConfig.js
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }
  const { token } = body;
  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Token ausente' }) };
  }
  try {
    await redis.del(`monitor:${token}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Erro ao deletar no Redis:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// public/monitor-attendant/js/monitor-attendant.js

/**
 * Adicione no HTML:
 * <button id="btn-delete-config">Redefinir Cadastro</button>
 */

document.addEventListener('DOMContentLoaded', () => {
  // ... código existente ...

  const btnDeleteConfig = document.getElementById('btn-delete-config');
  btnDeleteConfig.onclick = async () => {
    if (!token) return alert('Nenhum token válido para resetar.');
    if (!confirm('Confirma apagar empresa e senha no servidor?')) return;
    try {
      const res = await fetch('/.netlify/functions/deleteMonitorConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const { ok, error } = await res.json();
      if (ok) {
        localStorage.removeItem('monitorConfig');
        history.replaceState(null, '', '/monitor-attendant/');
        location.reload();
      } else {
        alert('Erro ao resetar no servidor: ' + error);
      }
    } catch (e) {
      console.error(e);
      alert('Falha na requisição de reset.');
    }
  };

  // ... restante do código ...
});
