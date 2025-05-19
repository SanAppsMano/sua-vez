// Autenticação + lógica com reset e identificador
const AUTH_PASSWORD = 'suaSenhaSegura';

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('login-overlay');
  const input   = document.getElementById('login-password');
  const btn     = document.getElementById('login-submit');
  const errorEl = document.getElementById('login-error');

  btn.addEventListener('click', () => {
    if (input.value === AUTH_PASSWORD) {
      overlay.remove();
      initApp();
    } else {
      errorEl.textContent = 'Senha incorreta.';
    }
  });
});

async function initApp() {
  const currentCallEl = document.getElementById('current-call');
  const currentIdEl   = document.getElementById('current-id');
  const waitingEl     = document.getElementById('waiting-count');
  const cancelListEl  = document.getElementById('cancel-list');

  const btnNext    = document.getElementById('btn-next');
  const btnRepeat  = document.getElementById('btn-repeat');
  const inputManual= document.getElementById('manual-input');
  const btnManual  = document.getElementById('btn-manual');
  const btnReset   = document.getElementById('btn-reset');
  const idInput    = document.getElementById('attendant-id');

  let callCounter = 0;

  const fmtTime = ts => new Date(ts).toLocaleTimeString();

  function updateCall(num, attendantId) {
    callCounter = num;
    currentCallEl.textContent = num;
    currentIdEl.textContent   = attendantId || '';
    fetchCancelled();
    fetchWaiting();
  }

  btnNext.onclick = async () => {
    const id  = idInput.value.trim();
    const url = `/.netlify/functions/chamar${id?`?id=${encodeURIComponent(id)}`:''}`;
    const { called, attendant } = await (await fetch(url)).json();
    updateCall(called, attendant);
  };

  btnRepeat.onclick = async () => {
    const id  = idInput.value.trim();
    const url = `/.netlify/functions/chamar?num=${callCounter}${id?`&id=${encodeURIComponent(id)}`:''}`;
    const { called, attendant } = await (await fetch(url)).json();
    updateCall(called, attendant);
  };

  btnManual.onclick = async () => {
    const num = Number(inputManual.value);
    if (!num) return alert('Digite um número válido');
    const id  = idInput.value.trim();
    const url = `/.netlify/functions/chamar?num=${num}${id?`&id=${encodeURIComponent(id)}`:''}`;
    const { called, attendant } = await (await fetch(url)).json();
    updateCall(called, attendant);
  };

  // Reset de contadores
  btnReset.onclick = async () => {
    if (!confirm('Confirma resetar todos os tickets para 1?')) return;
    const id  = idInput.value.trim();
    const url = `/.netlify/functions/reset${id?`?id=${encodeURIComponent(id)}`:''}`;
    await fetch(url, { method: 'POST' });
    updateCall(0, '');
    alert('Contadores resetados.');
  };

  // Busca cancelados
  async function fetchCancelled() {
    const { cancelled } = await (await fetch('/.netlify/functions/cancelados')).json();
    cancelListEl.innerHTML = '';
    cancelled.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${item.ticket}</span><span class="ts">${fmtTime(item.ts)}</span>`;
      cancelListEl.appendChild(li);
    });
  }

  // Em espera (a implementar endpoint de total se desejar)
  async function fetchWaiting() {
    waitingEl.textContent = '–';
  }

  // Inicialização
  const { currentCall, attendant } = await (await fetch('/.netlify/functions/status')).json();
  updateCall(currentCall, attendant);
}
