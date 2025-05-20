// public/monitor-attendant/js/monitor-attendant.js

/**
 * Script multi-tenant para a tela do atendente:
 * - Onboarding de tenant (empresa + senha) via Redis/Upstash
 * - Autenticação posterior (senha protegida)
 * - Renderização de QR Code para a fila do cliente
 * - Dropdown manual com tickets disponíveis
 * - Chamadas, repetição, reset, polling de cancelados e espera
 * - Interação QR: expandir e copiar link
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams     = new URL(location).searchParams;
  let token           = urlParams.get('t');
  let empresaParam    = urlParams.get('empresa');
  const storedConfig  = localStorage.getItem('monitorConfig');
  let cfg             = storedConfig ? JSON.parse(storedConfig) : null;

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

  // QR Interaction setup
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

  /** Renderiza o QR Code e configura interação */
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

  /** Exibe a interface principal após autenticação */
  function showApp(label, tId) {
    onboardOverlay.hidden = true;
    loginOverlay.hidden   = true;
    headerEl.hidden       = false;
    mainEl.hidden         = false;
    bodyEl.classList.add('authenticated');
    headerLabel.textContent = label;
    renderQRCode(tId);
    initApp(tId);
  }

  /** Inicializa polling e botões principais */
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
      const { currentCall, ticketCounter: tc } = await res.json();
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
      const { cancelled = [] } = await res.json();
      cancelListEl.innerHTML = '';
      cancelled.forEach(({ ticket, ts }) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${ticket}</span><span class="ts">${fmtTime(ts)}</span>`;
        cancelListEl.appendChild(li);
      });
    } catch (e) {
      console.error('Erro ao buscar cancelados:', e);
    }
  }

  // ■■■ Fluxo de Autenticação / Trial ■■■
  (async () => {
    // 1) Se já temos cfg em localStorage, pular direto
    if (cfg && cfg.empresa && cfg.senha) {
      showApp(cfg.empresa, token || '');
      return;
    }

    // 2) Se vier ?t e ?empresa na URL, pede só senha
    if (token && empresaParam) {
      loginOverlay.hidden   = true;
      onboardOverlay.hidden = true;
      try {
        const senhaPrompt = prompt(`Digite a senha de acesso para a empresa ${empresaParam}:`);
        const res = await fetch('/.netlify/functions/getMonitorConfig', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, senha: senhaPrompt })
        });
        if (!res.ok) throw new Error();
        const { empresa } = await res.json();
        cfg = { empresa, senha: senhaPrompt };
        localStorage.setItem('monitorConfig', JSON.stringify(cfg));
        // manter apenas empresa na URL
        history.replaceState(null, '', `/monitor-attendant/?empresa=${encodeURIComponent(empresaParam)}`);
        showApp(empresa, token);
        return;
      } catch {
        alert('Token ou senha inválidos.');
        history.replaceState(null, '', '/monitor-attendant/');
      }
    }

    // 3) Senão, exibir onboarding para trial
    onboardOverlay.hidden = false;
    loginOverlay.hidden   = true;

    onboardSubmit.onclick = async () => {
      const label = onboardLabel.value.trim();
      const pw    = onboardPassword.value;
      if (!label || !pw) {
        onboardError.textContent = 'Preencha nome e senha.';
        return;
      }
      onboardError.textContent = '';
      try {
        token = crypto.randomUUID().split('-')[0];
        const trialDays = 7;
        const res = await fetch('/.netlify/functions/saveMonitorConfig', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, empresa: label, senha: pw, trialDays })
        });
        const { ok } = await res.json();
        if (!ok) throw new Error();
        cfg = { empresa: label, senha: pw };
        localStorage.setItem('monitorConfig', JSON.stringify(cfg));
        history.replaceState(
          null, '',
          `/monitor-attendant/?t=${token}&empresa=${encodeURIComponent(label)}`
        );
        showApp(label, token);
      } catch (e) {
        console.error(e);
        onboardError.textContent = 'Erro ao criar monitor.';
      }
    };
  })();
});
