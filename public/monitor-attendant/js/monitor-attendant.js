// public/monitor-attendant/js/monitor-attendant.js

// Constante de autenticação — altere para sua senha real
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

  const btnNext     = document.getElementById('btn-next');
  const btnRepeat   = document.getElementById('btn-repeat');
  const selectManual= document.getElementById('manual-select');
  const btnManual   = document.getElementById('btn-manual');
  const btnReset    = document.getElementById('btn-reset');
  const idInput     = document.getElementById('attendant-id');

  let callCounter = 0;
  let ticketCounter = 0;
  const fmtTime = ts => new Date(ts).toLocaleTimeString();

  function updateManualOptions() {
    // limpa
    selectManual.innerHTML = '<option value="">Selecione...</option>';
    for (let n = callCounter + 1; n <= ticketCounter; n++) {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      selectManual.appendChild(opt);
    }
    selectManual.disabled = (callCounter + 1 > ticketCounter);
  }

  function updateCall(num, attendantId) {
    callCounter = num;
    currentCallEl.textContent = num;
    currentIdEl.textContent   = attendantId || '';
    fetchStatus();    // também atualizará ticketCounter e manual options
    fetchCancelled();
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
    const num = Number(selectManual.value);
    if (!num) return alert('Selecione um ticket válido');
    const id  = idInput.value.trim();
    const url = `/.netlify/functions/chamar?num=${num}${id?`&id=${encodeURIComponent(id)}`:''}`;
    const { called, attendant } = await (await fetch(url)).json();
    updateCall(called, attendant);
  };

  btnReset.onclick = async () => {
    if (!confirm('Confirma resetar todos os tickets para 1?')) return;
    const id  = idInput.value.trim();
    const url = `/.netlify/functions/reset${id?`?id=${encodeURIComponent(id)}`:''}`;
    await fetch(url, { method: 'POST' });
    updateCall(0, '');
    alert('Contadores resetados.');
  };

  async function fetchCancelled() {
    try {
      const { cancelled } = await (await fetch('/.netlify/functions/cancelados')).json();
      cancelListEl.innerHTML = '';
      cancelled.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${item.ticket}</span>
          <span class="ts">${fmtTime(item.ts)}</span>
        `;
        cancelListEl.appendChild(li);
      });
    } catch (e) {
      console.error('Erro ao buscar cancelados:', e);
    }
  }

  async function fetchStatus() {
    try {
      const { currentCall, ticketCounter: tc, attendant } =
        await (await fetch('/.netlify/functions/status')).json();
      callCounter = currentCall;
      ticketCounter = tc;
      currentCallEl.textContent = currentCall;
      currentIdEl.textContent   = attendant || '';
      waitingEl.textContent     = Math.max(0, ticketCounter - callCounter);
      updateManualOptions();
    } catch (e) {
      console.error('Erro ao buscar status:', e);
    }
  }

  // Inicializa tudo
  await fetchStatus();
  fetchCancelled();

  // Polling
  setInterval(fetchCancelled, 5000);
  setInterval(fetchStatus, 5000);
}
