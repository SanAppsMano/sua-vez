// public/client/js/client.js

// Elementos do DOM
const ticketEl    = document.getElementById("ticket");
const statusEl    = document.getElementById("status");
const btnCancel   = document.getElementById("btn-cancel");
const btnSilence  = document.getElementById("btn-silence");
const alertSound  = document.getElementById("alert-sound");

let clientId, ticketNumber;
let polling;        // interval de status
let alertInterval;  // interval de repetição do alarme

// 0) Overlay para destravar áudio/vibração
const overlay      = document.createElement("div");
overlay.id         = "overlay";
overlay.innerHTML  = `<button id="btn-start">Toque para ativar alertas</button>`;
document.body.appendChild(overlay);
const btnStart     = document.getElementById("btn-start");
btnStart.addEventListener("click", () => {
  // destravar
  alertSound.play().then(() => alertSound.pause()).catch(()=>{
    /* ignore */ 
  });
  if (navigator.vibrate) navigator.vibrate(1);
  if ("Notification" in window) Notification.requestPermission();
  overlay.remove();
  // agora inicia o fluxo normal
  getTicket();
  polling = setInterval(checkStatus, 2000);
});

// 1) Pega o ticket
async function getTicket() {
  try {
    const res  = await fetch("/.netlify/functions/entrar");
    const data = await res.json();
    clientId       = data.clientId;
    ticketNumber  = data.ticketNumber;
    ticketEl.textContent = ticketNumber;
    statusEl.textContent = "Aguardando chamada...";
  } catch (e) {
    statusEl.textContent = "Erro ao obter número. Recarregue.";
    console.error("Erro entrar:", e);
  }
}

// 2) Polling de status
async function checkStatus() {
  if (!ticketNumber) return;
  try {
    const res = await fetch("/.netlify/functions/status");
    const { currentCall } = await res.json();

    // Atualiza feedback de quem está chamando
    statusEl.textContent = currentCall === ticketNumber
      ? "É a sua vez!" 
      : `Chamando: ${currentCall}`;

    // Se é sua vez e não há batch de alertas ativo, dispara
    if (currentCall === ticketNumber && !alertInterval) {
      alertUser();
    }
  } catch (e) {
    console.error("Erro status:", e);
  }
}

// 3) Dispara e repete alerta
function alertUser() {
  btnSilence.hidden = false;

  const doAlert = () => {
    alertSound.currentTime = 0;
    alertSound.play().catch(()=>{});
    if (navigator.vibrate) navigator.vibrate([200,100,200]);
  };

  // Alerta imediato e depois a cada 5 s
  doAlert();
  alertInterval = setInterval(doAlert, 5000);

  // Desabilita “Desistir” enquanto estiver alertando
  btnCancel.disabled = true;
}

// 4) Silenciar o alertInterval atual
btnSilence.addEventListener("click", () => {
  clearInterval(alertInterval);
  alertInterval = null;
  alertSound.pause();
  alertSound.currentTime = 0;
  if (navigator.vibrate) navigator.vibrate(0);
  btnSilence.hidden = true;
});

// 5) Cancelar ticket
btnCancel.addEventListener("click", async () => {
  btnCancel.disabled = true;
  statusEl.textContent = "Cancelando...";
  clearInterval(alertInterval);
  alertInterval = null;
  try {
    await fetch("/.netlify/functions/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId })
    });
    clearInterval(polling);
    statusEl.textContent = "Você saiu da fila.";
    ticketEl.textContent = "–";
  } catch (e) {
    console.error("Erro ao cancelar:", e);
    statusEl.textContent = "Falha ao desistir. Tente novamente.";
    btnCancel.disabled = false;
  }
});
