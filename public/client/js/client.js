// public/client/js/client.js

const ticketEl    = document.getElementById("ticket");
const statusEl    = document.getElementById("status");
const btnCancel   = document.getElementById("btn-cancel");
const btnSilence  = document.getElementById("btn-silence");
const btnStart    = document.getElementById("btn-start");
const overlay     = document.getElementById("overlay");
const alertSound  = document.getElementById("alert-sound");

let clientId, ticketNumber;
let polling, alertInterval;
let lastEventTs = 0;
let silenced   = false;

// 0) Destravar alertas com um toque
btnStart.addEventListener("click", () => {
  alertSound.play().then(() => alertSound.pause()).catch(() => {});
  if (navigator.vibrate) navigator.vibrate(1);
  if ("Notification" in window) Notification.requestPermission();
  overlay.remove();
  btnCancel.disabled = false;
  getTicket();
  polling = setInterval(checkStatus, 2000);
});

// 1) Solicita ticket
async function getTicket() {
  try {
    const res  = await fetch("/.netlify/functions/entrar");
    const data = await res.json();
    clientId      = data.clientId;
    ticketNumber  = data.ticketNumber;
    ticketEl.textContent  = ticketNumber;
    statusEl.textContent  = "Aguardando chamada...";
  } catch (e) {
    console.error("Erro entrar:", e);
    statusEl.textContent = "Erro ao obter número. Recarregue.";
  }
}

// 2) Polling de status
async function checkStatus() {
  if (!ticketNumber) return;
  try {
    const res = await fetch("/.netlify/functions/status");
    const { currentCall, timestamp } = await res.json();

    // Atualiza exibição
    statusEl.textContent = currentCall === ticketNumber
      ? "É a sua vez!"
      : `Chamando: ${currentCall}`;

    // Controla habilitação de 'Desistir'
    btnCancel.disabled = (currentCall === ticketNumber);

    // Se for sua vez e evento novo
    if (currentCall === ticketNumber && timestamp > lastEventTs) {
      silenced      = false;
      lastEventTs   = timestamp;
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
    if (silenced) return;
    alertSound.currentTime = 0;
    alertSound.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate([200,100,200]);
  };

  doAlert();
  alertInterval = setInterval(doAlert, 5000);
}

// 4) Silenciar apenas o ciclo atual
btnSilence.addEventListener("click", () => {
  silenced = true;
  clearInterval(alertInterval);
  alertSound.pause();
  alertSound.currentTime = 0;
  if (navigator.vibrate) navigator.vibrate(0);
  btnSilence.hidden = true;
});

// 5) Desistir da fila
btnCancel.addEventListener("click", async () => {
  btnCancel.disabled = true;
  statusEl.textContent = "Cancelando...";
  clearInterval(alertInterval);
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
