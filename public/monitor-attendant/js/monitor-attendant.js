// public/monitor-attendant/js/monitor-attendant.js

document.addEventListener('DOMContentLoaded', () => {
  const urlParams    = new URL(location).searchParams;
  const tenantParam  = urlParams.get('t');
  const storedTenant = localStorage.getItem('tenantId');
  const tenantId     = tenantParam || storedTenant;

  // Elementos de overlay e UI
  const onboardOverlay = document.getElementById('onboard-overlay');
  const loginOverlay   = document.getElementById('login-overlay');
  const headerEl       = document.querySelector('.header');
  const mainEl         = document.querySelector('.main');
  const bodyEl         = document.body;

  // Onboarding
  const onboardLabel    = document.getElementById('onboard-label');
  const onboardPassword = document.getElementById('onboard-password');
  const onboardSubmit   = document.getElementById('onboard-submit');
  const onboardError    = document.getElementById('onboard-error');

  // Login
  const loginPassword = document.getElementById('login-password');
  const loginSubmit   = document.getElementById('login-submit');
  const loginError    = document.getElementById('login-error');

  // UI principal
  const headerLabel    = document.getElementById('header-label');
  const attendantInput = document.getElementById('attendant-id');
  const currentCallEl  = document.getElementById('current-call');
  const currentIdEl    = document.getElementById('current-id');
  const waitingEl      = document.getElementById('waiting-count');
  const cancelListEl   = document.getElementById('cancel-list');
  const btnNext        = document.getElementById('btn-next');
  const btnRepeat      = document.getElementById('btn-repeat');
  const selectManual   = document.getElementById('manual-select');
  const btnManual      = document.getElementById('btn-manual');
  const btnReset       = document.getElementById('btn-reset');

  let callCounter   = 0;
  let ticketCounter = 0;
  const fmtTime     = ts => new Date(ts).toLocaleTimeString();

  // ■■■ Onboarding ■■■
  onboardSubmit.onclick = async () => {
    const label = onboardLabel.value.trim();
    const pw    = onboardPassword.value;
    if (!label || !pw) {
      onboardError.textContent = 'Preencha nome e senha.';
      return;
    }
    try {
      const newTenant = tenantId || crypto.randomUUID().split('-')[0];
      const res = await fetch('/.netlify/functions/registerMonitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: newTenant, label, password: pw })
      });
      if (!res.ok) throw new Error('Registro falhou');
      const { success } = await res.json();
      if (!success) throw new Error('Registro inválido');
      localStorage.setItem('tenantId', newTenant);
      showApp(label, newTenant);
    } catch (e) {
      console.error(e);
      onboardError.textContent = 'Erro ao criar monitor.';
    }
  };

  // ■■■ Login ■■■
  loginSubmit.onclick = async () => {
    const pw = loginPassword.value;
    if (!pw) {
      loginError.textContent = 'Digite a senha.';
      return;
    }
    try {
      const t = tenantId;
      const res = await fetch(`/.netlify/functions/validatePassword?t=${t}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      const { valid, label } = await res.json();
      if (valid) {
        showApp(label, t);
      } else {
        loginError.textContent = 'Senha incorreta.';
      }
    } catch (e) {
      console.error(e);
      loginError.textContent = 'Erro no login.';
    }
  };

  // ■■■ Mostrar UI principal ■■■
  async function showApp(label, tId) {
    onboardOverlay.hidden = true;
    loginOverlay.hidden   = true;
    headerEl.hidden       = false;
    mainEl.hidden         = false;
    bodyEl.classList.add('authenticated');
    headerLabel.textContent = label;
    localStorage.setItem('tenantId', tId);
    initApp(tId);
  }

  // Fluxo inicial: onboarding vs login
  (async () => {
    if (!tenantId) {
      onboardOverlay.hidden = false;
      loginOverlay.hidden   = true;
    } else {
      onboardOverlay.hidden = true;
      const res = await fetch(`/.netlify/functions/getTenantConfig?t=${tenantId}`);
      if (res.ok) {
        loginOverlay.hidden = false;
      } else {
        localStorage.removeItem('tenantId');
        history.replaceState(null, '', '/monitor-attendant/');
        onboardOverlay.hidden = false;
      }
    }
  })();

  // ■■■ Lógica Principal ■■■
  function initApp(t) {
    // Carrega status e cancelados
    fetchStatus(t);
    fetchCancelled(t);
    setInterval(() => fetchStatus(t), 5000);
    setInterval(() => fetchCancelled(t), 5000);

    btnNext.onclick = async () => {
      const id = attendantInput.value.trim();
      const url = `/.netlify/functions/chamar?t=${t}${id?`&id=${encodeURIComponent(id)}`:''}`;
      const { called, attendant } = await (await fetch(url)).json();
      updateCall(called, attendant);
    };

    btnRepeat.onclick = async () => {
      const id = attendantInput.value.trim();
      const url = `/.netlify/functions/chamar?t=${t}&num=${callCounter}${id?`&id=${encodeURIComponent(id)}`:''}`;
      const { called, attendant } = await (await fetch(url)).json();
      updateCall(called, attendant);
    };

    btnManual.onclick = async () => {
      const num = Number(selectManual.value);
      if (!num) return alert('Selecione um ticket válido');
      const id = attendantInput.value.trim();
      const url = `/.netlify/functions/chamar?t=${t}&num=${num}${id?`&id=${encodeURIComponent(id)}`:''}`;
      const { called, attendant } = await (await fetch(url)).json();
      updateCall(called, attendant);
    };

    btnReset.onclick = async () => {
      if (!confirm('Confirma resetar todos os tickets para 1?')) return;
      const id = attendantInput.value.trim();
      await fetch(`/.netlify/functions/reset?t=${t}${id?`&id=${encodeURIComponent(id)}`:''}`, {
        method: 'POST'
      });
      updateCall(0, '');
    };
  }

  // Atualiza chamada atual
  function updateCall(num, attendantId) {
    callCounter = num;
    currentCallEl.textContent = num > 0 ? num : '–';
    currentIdEl.textContent   = attendantId || '';
  }

  // Busca status (chamados e tickets)
  async function fetchStatus(t) {
    try {
      const res = await fetch(`/.netlify/functions/status?t=${t}`);
      const { currentCall, ticketCounter: tc, attendant } = await res.json();
      callCounter   = currentCall;
      ticketCounter = tc;
      currentCallEl.textContent = currentCall > 0 ? currentCall : '–';
      currentIdEl.textContent   = attendant || '';
      waitingEl.textContent     = currentCall < tc ? tc - currentCall : 0;
      updateManualOptions();
    } catch (e) {
      console.error('Erro ao buscar status:', e);
    }
  }

  // Preenche dropdown manual
  function updateManualOptions() {
    selectManual.innerHTML = '<option value="">Selecione...</option>';
    for (let i = callCounter + 1; i <= ticketCounter; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i;
      selectManual.appendChild(opt);
    }
    selectManual.disabled = callCounter + 1 > ticketCounter;
  }

  // Busca lista de cancelados
  async function fetchCancelled(t) {
    try {
      const res = await fetch(`/.netlify/functions/cancelados?t=${t}`);
      const body = await res.json();
      const list = Array.isArray(body.cancelled) ? body.cancelled : [];
      cancelListEl.innerHTML = '';
      list.forEach(item => {
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
});
