// public/monitor-attendant/js/monitor-attendant.js

/**
 * Script multi-tenant para a tela do atendente:
 * - Onboarding de tenant (empresa + senha)
 * - Autenticação posterior
 * - Dropdown manual com tickets disponíveis
 * - Chamadas, repetição, reset, polling de cancelados e espera
 */

document.addEventListener('DOMContentLoaded', () => {
  const tenantParam = new URL(location).searchParams.get('t');
  const storedTenant = localStorage.getItem('tenantId');
  const tenantId = tenantParam || storedTenant;

  // Elementos
  const onboardOverlay = document.getElementById('onboard-overlay');
  const loginOverlay   = document.getElementById('login-overlay');
  const headerEl       = document.querySelector('.header');
  const mainEl         = document.querySelector('.main');
  const bodyEl         = document.body;

  // Onboarding inputs
  const onboardLabel     = document.getElementById('onboard-label');
  const onboardPassword  = document.getElementById('onboard-password');
  const onboardSubmit    = document.getElementById('onboard-submit');
  const onboardError     = document.getElementById('onboard-error');

  // Login inputs
  const loginPassword   = document.getElementById('login-password');
  const loginSubmit     = document.getElementById('login-submit');
  const loginError      = document.getElementById('login-error');

  // Tela principal
  const headerLabel     = document.getElementById('header-label');
  const attendantInput  = document.getElementById('attendant-id');
  const currentCallEl   = document.getElementById('current-call');
  const currentIdEl     = document.getElementById('current-id');
  const waitingEl       = document.getElementById('waiting-count');
  const cancelListEl    = document.getElementById('cancel-list');
  const btnNext         = document.getElementById('btn-next');
  const btnRepeat       = document.getElementById('btn-repeat');
  const selectManual    = document.getElementById('manual-select');
  const btnManual       = document.getElementById('btn-manual');
  const btnReset        = document.getElementById('btn-reset');

  let callCounter = 0;
  let ticketCounter = 0;

  const fmtTime = ts => new Date(ts).toLocaleTimeString();

  // ■■■ Onboarding & Registration ■■■
  onboardSubmit.onclick = async () => {
    const label = onboardLabel.value.trim();
    const pw    = onboardPassword.value;
    if (!label || !pw) return onboardError.textContent = 'Preencha ambos.';
    try {
      const newTenant = tenantId || crypto.randomUUID().split('-')[0];
      const res = await fetch('/.netlify/functions/registerMonitor', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ tenantId:newTenant, label, password:pw })
      });
      if (!res.ok) throw new Error('Falha no registro');
      localStorage.setItem('tenantId', newTenant);
      location.search = `?t=${newTenant}`;
    } catch (e) {
      onboardError.textContent = 'Erro ao criar monitor.';
      console.error(e);
    }
  };

  // ■■■ Login Existing Tenant ■■■
  loginSubmit.onclick = async () => {
    const pw = loginPassword.value;
    try {
      const t = tenantId;
      const res = await fetch(`/.netlify/functions/validatePassword?t=${t}`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ password: pw })
      });
      const { valid, label } = await res.json();
      if (valid) {
        localStorage.setItem('tenantId', t);
        showApp(label);
      } else {
        loginError.textContent = 'Senha incorreta.';
      }
    } catch (e) {
      loginError.textContent = 'Erro no login.';
      console.error(e);
    }
  };

  // Mostra a UI principal
  async function showApp(label) {
    onboardOverlay.hidden = true;
    loginOverlay.hidden   = true;
    headerEl.hidden       = false;
    mainEl.hidden         = false;
    bodyEl.classList.add('authenticated');
    headerLabel.textContent = label;
    await initApp();
  }

  // Decidir fluxo: onboarding vs login vs show
  (async () => {
    if (!tenantId) {
      onboardOverlay.hidden = false;
      loginOverlay.hidden   = true;
    } else {
      // já existe tenantId
      onboardOverlay.hidden = true;
      // checar se tenant config existe
      const res = await fetch(`/.netlify/functions/getTenantConfig?t=${tenantId}`);
      if (res.ok) {
        loginOverlay.hidden = false;
      } else {
        // ID inválido: volta onboarding
        localStorage.removeItem('tenantId');
        location.search = '';
        onboardOverlay.hidden = false;
      }
    }
  })();

  // ■■■ Main App Logic ■■■
  async function initApp() {
    // busca status inicial e dispara polling
    await fetchStatus();
    fetchCancelled();
    setInterval(fetchStatus, 5000);
    setInterval(fetchCancelled, 5000);

    btnNext.onclick = async () => {
      const id  = attendantInput.value.trim();
      const res = await fetch(`/.netlify/functions/chamar?t=${tenantId}${id?`&id=${encodeURIComponent(id)}`:''}`);
      const { called, attendant } = await res.json();
      updateCall(called, attendant);
    };

    btnRepeat.onclick = async () => {
      const id  = attendantInput.value.trim();
      const res = await fetch(`/.netlify/functions/chamar?t=${tenantId}&num=${callCounter}${id?`&id=${encodeURIComponent(id)}`:''}`);
      const { called, attendant } = await res.json();
      updateCall(called, attendant);
    };

    btnManual.onclick = async () => {
      const num = Number(selectManual.value);
      if (!num) return alert('Selecione um ticket válido');
      const id  = attendantInput.value.trim();
      const res = await fetch(`/.netlify/functions/chamar?t=${tenantId}&num=${num}${id?`&id=${encodeURIComponent(id)}`:''}`);
      const { called, attendant } = await res.json();
      updateCall(called, attendant);
    };

    btnReset.onclick = async () => {
      if (!confirm('Confirma resetar todos os tickets para 1?')) return;
      const id  = attendantInput.value.trim();
      const res = await fetch(`/.netlify/functions/reset?t=${tenantId}${id?`&id=${encodeURIComponent(id)}`:''}`, { method:'POST' });
      if (res.ok) updateCall(0, '');
    };
  }

  function updateCall(num, attendantId) {
    callCounter = num;
    currentCallEl.textContent = num;
    currentIdEl.textContent   = attendantId || '';
  }

  async function fetchStatus() {
    try {
      const res = await fetch(`/.netlify/functions/status?t=${tenantId}`);
      const { currentCall, ticketCounter: tc, attendant } = await res.json();
      callCounter     = currentCall;
      ticketCounter   = tc;
      currentCallEl.textContent = currentCall;
      currentIdEl.textContent   = attendant || '';
      waitingEl.textContent     = Math.max(0, tc - currentCall);
      updateManualOptions();
    } catch (e) {
      console.error('Erro ao buscar status:', e);
    }
  }

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

  async function fetchCancelled() {
    try {
      const res = await fetch(`/.netlify/functions/cancelados?t=${tenantId}`);
      const { cancelled } = await res.json();
      cancelListEl.innerHTML = '';
      cancelled.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.ticket}</span><span class="ts">${fmtTime(item.ts)}</span>`;
        cancelListEl.appendChild(li);
      });
    } catch (e) {
      console.error('Erro ao buscar cancelados:', e);
    }
  }
});
