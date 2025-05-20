// public/monitor-attendant/js/monitor-attendant.js

/**
 * Script multi-tenant para a tela do atendente:
 * - Onboarding de tenant (empresa + senha)
 * - Autenticação posterior
 * - Renderização de QR Code para a fila do cliente
 * - Dropdown manual com tickets disponíveis
 * - Chamadas, repetição, reset, polling de cancelados e espera
 * - Interação QR: expandir e copiar link
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams    = new URL(location).searchParams;
  const tenantParam  = urlParams.get('t');
  const storedTenant = localStorage.getItem('tenantId');
  const tenantId     = tenantParam || storedTenant;

  // Overlays e seções
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

  // QR Interaction
  const qrContainer    = document.getElementById('qrcode');
  const qrOverlay      = document.createElement('div');
  qrOverlay.id = 'qrcode-overlay';
  Object.assign(qrOverlay.style, {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)', display: 'none',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    padding: '1rem'
  });
  const qrOverlayContent = document.createElement('div');
  qrOverlayContent.id = 'qrcode-overlay-content';
  Object.assign(qrOverlayContent.style, {
    background: '#fff', padding: '1rem', borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)', maxWidth: '90%', maxHeight: '90%'
  });
  qrOverlay.appendChild(qrOverlayContent);
  document.body.appendChild(qrOverlay);

  let callCounter   = 0;
  let ticketCounter = 0;
  const fmtTime     = ts => new Date(ts).toLocaleTimeString();

  function renderQRCode(tId) {
    qrContainer.innerHTML = '';
    qrOverlayContent.innerHTML = '';
    const urlCliente = `${location.origin}/client/?t=${tId}`;
    new QRCode(qrContainer, { text: urlCliente, width: 128, height: 128 });
    new QRCode(qrOverlayContent, { text: urlCliente, width: 256, height: 256 });

    qrContainer.style.cursor = 'pointer';
    qrContainer.onclick = () => {
      navigator.clipboard.writeText(urlCliente).then(() => {
        qrOverlay.style.display = 'flex';
      });
    };
    qrOverlay.onclick = (e) => {
      if (e.target === qrOverlay) qrOverlay.style.display = 'none';
    };
  }

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
      const res = await fetch(`/.netlify/functions/registerMonitor?t=${newTenant}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: newTenant, label, password: pw })
      });
      const { success } = await res.json();
      if (!success) throw new Error('Registro inválido');
      localStorage.setItem('tenantId', newTenant);
      history.replaceState(null, '', `/monitor-attendant/?t=${newTenant}`);
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
      const res = await fetch(`/.netlify/functions/validatePassword?t=${tenantId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      const { valid, label } = await res.json();
      if (valid) {
        history.replaceState(null, '', `/monitor-attendant/?t=${tenantId}`);
        showApp(label, tenantId);
      } else {
        loginError.textContent = 'Senha incorreta.';
      }
    } catch (e) {
      console.error(e);
      loginError.textContent = 'Erro no login.';
    }
  };

  async function showApp(label, tId) {
    onboardOverlay.hidden = true;
    loginOverlay.hidden   = true;
    headerEl.hidden       = false;
    mainEl.hidden         = false;
    bodyEl.classList.add('authenticated');
    headerLabel.textContent = label;
    renderQRCode(tId);
    initApp(tId);
  }

  (async () => {
    if (!tenantId) {
      onboardOverlay.hidden = false;
      loginOverlay.hidden = true;
    } else {
      onboardOverlay.hidden = true;
      const res = await fetch(`/.netlify/functions/getTenantConfig?t=${tenantId}`);
      if (res.ok) loginOverlay.hidden = false;
      else {
        localStorage.removeItem('tenantId');
        history.replaceState(null, '', '/monitor-attendant/');
        onboardOverlay.hidden = false;
      }
    }
  })();

  function initApp(t) {
    fetchStatus(t);
    fetchCancelled(t);
    setInterval(() => fetchStatus(t), 5000);
    setInterval(() => fetchCancelled(t), 5000);

    btnNext.onclick = async () => {
      const id = attendantInput.value.trim();
      let url = `/.netlify/functions/chamar?t=${t}`;
      if (id) url += `&id=${encodeURIComponent(id)}`;
      const { called, attendant } = await (await fetch(url)).json();
      updateCall(called, attendant);
    };

    btnRepeat.onclick = async () => {
      let url = `/.netlify/functions/chamar?t=${t}&num=${callCounter}`;
      const { called, attendant } = await (await fetch(url)).json();
      updateCall(called, attendant);
    };

    btnManual.onclick = async () => {
      const num = Number(selectManual.value);
      if (!num) return;
      const url = `/.netlify/functions/chamar?t=${t}&num=${num}`;
      const { called, attendant } = await (await fetch(url)).json();
      updateCall(called, attendant);
    };

    btnReset.onclick = async () => {
      if (!confirm('Confirma resetar todos os tickets para 1?')) return;
      await fetch(`/.netlify/functions/reset?t=${t}`, { method: 'POST' });
      updateCall(0, '');
    };
  }

  function updateCall(num, attendantId) {
    callCounter = num;
    currentCallEl.textContent = num > 0 ? num : '–';
    currentIdEl.textContent   = attendantId || '';
  }

  async function fetchStatus(t) {
    try {
      const res = await fetch(`/.netlify/functions/status?t=${t}`);
      const { currentCall, ticketCounter: tc, attendant } = await res.json();
      callCounter = currentCall;
      ticketCounter = tc;
      currentCallEl.textContent = currentCall > 0 ? currentCall : '–';
      waitingEl.textContent = Math.max(0, tc - currentCall);
      updateManualOptions();
    } catch (e) {
      console.error(e);
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

  async function fetchCancelled(t) {
    try {
      const res = await fetch(`/.netlify/functions/cancelados?t=${t}`);
      const data = await res.json();
      const list = Array.isArray(data.cancelled) ? data.cancelled : [];
      cancelListEl.innerHTML = '';
      list.forEach(({ ticket, ts }) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${ticket}</span>` +
                       `<span class=\"ts\">${fmtTime(ts)}</span>`;
        cancelListEl.appendChild(li);
      });
    } catch (e) {
      console.error('Erro ao buscar cancelados:', e);
    }
  }
});
