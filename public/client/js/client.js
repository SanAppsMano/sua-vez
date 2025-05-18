// public/client/js/client.js

const ticketEl   = document.getElementById("ticket");
const statusEl   = document.getElementById("status");
const btnCancel  = document.getElementById("btn-cancel");
const btnSilence = document.getElementById("btn-silence");
const btnStart   = document.getElementById("btn-start");
const overlay    = document.getElementById("overlay");
const alertSound = document.getElementById("alert-sound");

let clientId, ticketNumber;
let polling, alertInterval;
let silenced = false;

// 0) Destravar áudio/vibração/notificações
btnStart.addEventListener("click", () => {
  // Áudio
  alertSound.play().then(() => alertSound.pause()).catch(()=>{});
  // Vibração
  if (navigator.vibrate) navigator.vibrate(1);
  // Notificações
  if ("Notification" in window) Notification.requestPermission();
  // Esconder overlay
  overlay.remove();
  // Ativar botão cancelar
  btnCancel.disabled = false;
  // Iniciar fluxo
  getTicket();
  polling = setInterval(checkStatus, 2000);
});

// 1) Solicita ticket
async function getTicket() {
  try {
    const res  = await fetch("/.netlify/functions/entrar");
    const data = await res.json();
    clientId      = data.clientId;
    ticketNumber = data.ticketNumber;
    ticketEl.textContent   = ticketNumber;
    statusEl.textContent   = "Aguardando chamada...";
  } catch (e) {
    console.error("Erro ao entrar:", e);
    statusEl.textContent = "Erro ao obter número. Recarregue.";
  }
}

// 2) Polling de status
async function checkStatus() {
  if (!ticketNumber) return;
  try {
    const res = await fetch("/.netlify/functions/status");
    const { currentCall } = await res.json();

    // Atualiza status
    if (currentCall !== ticketNumber) {
      statusEl.textContent = `Chamando: ${currentCall}`;
      return;
    }

    // Se for sua vez e não estiver em alerta
    if (currentCall === ticketNumber && !alertInterval) {
      alertUser();
    }
  } catch (e) {
    console.error("Erro status:", e);
  }
}

// 3) Dispara e repete alerta
function alertUser() {
  statusEl.textContent = "É a sua vez!";
  btnSilence.hidden    = false;

  const doAlert = () => {
    if (silenced) return;
    alertSound.currentTime = 0;
    alertSound.play().catch(err => console.warn("play() falhou:", err));
    if (navigator.vibrate) {
      const ok = navigator.vibrate([200,100,200]);
      console.log("vibrate:", ok);
    }
  };

  // Primeira chamada imediata
  doAlert();
  // Repetir a cada 5 s
  alertInterval = setInterval(doAlert, 5000);
}

// 4) Silenciar alerta (apenas este ciclo)
btnSilence.addEventListener("click", () => {
  silenced = true;
  clearInterval(alertInterval);
  alertInterval = null;
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
