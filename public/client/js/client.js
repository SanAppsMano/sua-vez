// Destrava áudio/vibração num toque do usuário
const alertSound = document.getElementById("alert-sound");
document.body.addEventListener('touchstart', () => {
  // tenta tocar e parar imediatamente
  alertSound.play().then(() => alertSound.pause()).catch(() => {});
  // desbloqueia vibração (Android)
  if (navigator.vibrate) navigator.vibrate(1);
}, { once: true });

// … resto do código permanece igual …

// public/client/js/client.js
let clientId, ticketNumber;
const ticketEl = document.getElementById("ticket");
const statusEl = document.getElementById("status");
const btnCancel = document.getElementById("btn-cancel");
const alertSound = document.getElementById("alert-sound");

// 1) Pega o ticket
async function getTicket() {
  try {
    const res = await fetch("/.netlify/functions/entrar");
    const data = await res.json();
    clientId = data.clientId;
    ticketNumber = data.ticketNumber;
    ticketEl.textContent = ticketNumber;
    requestNotificationPermission();
  } catch (e) {
    statusEl.textContent = "Erro ao obter número. Recarregue.";
    console.error(e);
  }
}

// 2) Polling status e alerta
async function checkStatus() {
  if (!ticketNumber) return;
  try {
    const res = await fetch("/.netlify/functions/status");
    const { currentCall } = await res.json();
    if (currentCall === ticketNumber) {
      alertUser();
    }
  } catch (e) {
    console.error("Erro status:", e);
  }
}

// Dispara alerta visual, sonoro e vibração
function alertUser() {
  statusEl.textContent = "É a sua vez!";
  alertSound.play();
  if (navigator.vibrate) navigator.vibrate([200,100,200]);
  // após chamar, impede novos alertas
  clearInterval(polling);
}

// 3) Cancelar ticket
async function cancelTicket() {
  btnCancel.disabled = true;
  try {
    await fetch("/.netlify/functions/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId })
    });
    statusEl.textContent = "Você saiu da fila.";
  } catch (e) {
    console.error("Erro ao cancelar:", e);
    statusEl.textContent = "Falha ao desistir. Tente novamente.";
    btnCancel.disabled = false;
  }
}

// Solicita permissão de Notificação (para aviso futuro)
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission().then();
  }
}

// Se quiser exibir notificação nativa
function notifyBrowser() {
  if (Notification.permission === "granted") {
    new Notification("SuaVez", { body: "É a sua vez! Dirija-se ao atendimento." });
  }
}

// Event listeners
btnCancel.addEventListener("click", cancelTicket);

// Inicialização
getTicket();
const polling = setInterval(checkStatus, 2000);
