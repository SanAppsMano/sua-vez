// public/client/js/client.js

// Elementos do DOM
const ticketEl     = document.getElementById("ticket");
const statusEl     = document.getElementById("status");
const btnCancel    = document.getElementById("btn-cancel");
const alertSound   = document.getElementById("alert-sound");

let clientId, ticketNumber;
let polling;

// 0) Destrava áudio/vibração num toque do usuário
document.body.addEventListener("touchstart", () => {
  // Tenta tocar e pausar imediatamente para liberar autoplay
  alertSound.play().then(() => alertSound.pause()).catch(() => {});
  // Vibração mínima para destravar (Android)
  if (navigator.vibrate) navigator.vibrate(1);
}, { once: true });

// 1) Pega o ticket ao carregar
async function getTicket() {
  try {
    const res  = await fetch("/.netlify/functions/entrar");
    const data = await res.json();
    clientId      = data.clientId;
    ticketNumber = data.ticketNumber;
    ticketEl.textContent = ticketNumber;
    statusEl.textContent = "Aguardando chamada...";
    // Começa o polling só depois de obter o número
    polling = setInterval(checkStatus, 2000);
  } catch (e) {
    statusEl.textContent = "Erro ao obter número. Recarregue.";
    console.error("Erro entrar:", e);
  }
}

// 2) Polling para verificar se foi chamado
async function checkStatus() {
  if (!ticketNumber) return;
  try {
    const res = await fetch("/.netlify/functions/status");
    const { currentCall } = await res.json();
    // Atualiza feedback de posição (opcional)
    if (statusEl.textContent.indexOf("É a sua vez") === -1) {
      statusEl.textContent = `Chamando: ${currentCall}`;
    }
    // Se chegou a sua vez
    if (currentCall === ticketNumber) {
      alertUser();
    }
  } catch (e) {
    console.error("Erro status:", e);
  }
}

// 3) Dispara alerta visual, sonoro e vibração
function alertUser() {
  statusEl.textContent = "É a sua vez!";
  // Som
  alertSound.play().catch(() => {});
  // Vibração (Android)
  if (navigator.vibrate) navigator.vibrate([200,100,200]);
  // Notificação nativa
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("SuaVez", {
      body: "É a sua vez! Dirija-se ao atendimento.",
      silent: true
    });
  }
  // Para o polling para não repetir
  clearInterval(polling);
  // Desabilita o botão de cancelar, já que foi chamado
  btnCancel.disabled = true;
}

// 4) Cancelar ticket
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

// Event listeners
btnCancel.addEventListener("click", cancelTicket);

// 5) Solicita permissão de Notificação
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

// Inicialização
requestNotificationPermission();
getTicket();
