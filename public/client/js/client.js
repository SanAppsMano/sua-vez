// public/client/js/client.js

// Elementos do DOM
const container   = document.querySelector(".container");
const overlay     = document.createElement("div");
overlay.id        = "overlay";
overlay.innerHTML = `
  <button id="btn-start">Toque para ativar alertas</button>
`;
document.body.appendChild(overlay);

const ticketEl   = document.getElementById("ticket");
const statusEl   = document.getElementById("status");
const btnCancel  = document.getElementById("btn-cancel");
const alertSound = document.getElementById("alert-sound");

let clientId, ticketNumber;
let polling;

// 0) Função para destravar áudio, vibração e notificações
function unlockAlerts() {
  // Audio unlock
  alertSound.play().then(() => alertSound.pause()).catch(() => {});
  // Vibração mínima (Android)
  if (navigator.vibrate) navigator.vibrate(1);
  // Notificações
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

// 1) Iniciar tudo após o botão ser tocado
document.getElementById("btn-start").addEventListener("click", () => {
  unlockAlerts();
  overlay.remove();       // esconde o overlay
  getTicket();            // solicita ticket
  polling = setInterval(checkStatus, 2000);
});

// 2) Pegar o ticket
async function getTicket() {
  try {
    const res  = await fetch("/.netlify/functions/entrar");
    const data = await res.json();
    clientId      = data.clientId;
    ticketNumber  = data.ticketNumber;
    ticketEl.textContent = ticketNumber;
    statusEl.textContent = "Aguardando chamada...";
  } catch (e) {
    statusEl.textContent = "Erro ao obter número. Recarregue.";
    console.error("Erro entrar:", e);
  }
}

// 3) Polling para verificar se foi chamado
async function checkStatus() {
  if (!ticketNumber) return;
  try {
    const res = await fetch("/.netlify/functions/status");
    const { currentCall } = await res.json();
    if (statusEl.textContent.indexOf("É a sua vez") === -1) {
      statusEl.textContent = `Chamando: ${currentCall}`;
    }
    if (currentCall === ticketNumber) {
      alertUser();
    }
  } catch (e) {
    console.error("Erro status:", e);
  }
}

// 4) Dispara alerta visual, sonoro e vibração
function alertUser() {
  statusEl.textContent = "É a sua vez!";
  alertSound.play().catch(() => {});
  if (navigator.vibrate) navigator.vibrate([200,100,200]);
  if (Notification.permission === "granted") {
    new Notification("SuaVez", {
      body: "É a sua vez!",
      silent: true
    });
  }
  clearInterval(polling);
  btnCancel.disabled = true;
}

// 5) Cancelar ticket
async function cancelTicket() {
  btnCancel.disabled = true;
  statusEl.textContent = "Cancelando...";
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
}

// Event listener do botão “Desistir”
btnCancel.addEventListener("click", cancelTicket);
