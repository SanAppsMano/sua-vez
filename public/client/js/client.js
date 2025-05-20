// public/client/js/client.js

// elementos
const ticketEl   = document.getElementById("ticket");
const statusEl   = document.getElementById("status");
const btnCancel  = document.getElementById("btn-cancel");
const btnSilence = document.getElementById("btn-silence");
const btnStart   = document.getElementById("btn-start");
const overlay    = document.getElementById("overlay");
const alertSound = document.getElementById("alert-sound");

let clientId, ticketNumber;
let polling, alertInterval;
let lastEventTs = 0;
let silenced   = false;

// Captura o tenantId da URL
const urlParams = new URL(location).searchParams;
const tenantId  = urlParams.get("t");

// Função auxiliar para montar a URL do function
function fnUrl(fnName, method = "", body) {
  let url = `/.netlify/functions/${fnName}?t=${tenantId}`;
  if (method === "GET") return url;
  return { url, opts: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } };
}

btnStart.addEventListener("click", () => {
  alertSound.play().then(() => alertSound.pause()).catch(()=>{});
  if (navigator.vibrate) navigator.vibrate(1);
  if ("Notification" in window) Notification.requestPermission();
  overlay.remove();
  btnCancel.disabled = false;
  getTicket();
  polling = setInterval(checkStatus, 2000);
});

async function getTicket() {
  // Chama /entrar?t=...
  const { url, opts } = fnUrl("entrar", "POST");
  const res = await fetch(url, opts);
  const data = await res.json();
  clientId      = data.clientId;
  ticketNumber  = data.ticketNumber;
  ticketEl.textContent = ticketNumber;
  statusEl.textContent = "Aguardando chamada...";
}

async function checkStatus() {
  if (!ticketNumber) return;
  // Chama /status?t=...
  const { url } = fnUrl("status", "GET");
  const res = await fetch(url);
  const { currentCall, timestamp, attendant } = await res.json();

  if (currentCall !== ticketNumber) {
    statusEl.textContent = `Chamando: ${currentCall} (${attendant})`;
    btnCancel.disabled = false;
    statusEl.classList.remove("blink");
    return;
  }

  statusEl.textContent = `É a sua vez! (Atendente: ${attendant})`;
  statusEl.classList.add("blink");
  btnCancel.disabled = true;

  if (timestamp > lastEventTs) {
    silenced    = false;
    lastEventTs = timestamp;
    alertUser();
  }
}

function alertUser() {
  btnSilence.hidden = false;
  const doAlert = () => {
    if (silenced) return;
    alertSound.currentTime = 0;
    alertSound.play().catch(()=>{});
    if (navigator.vibrate) navigator.vibrate([200,100,200]);
  };
  doAlert();
  alertInterval = setInterval(doAlert, 5000);
}

btnSilence.addEventListener("click", () => {
  silenced = true;
  clearInterval(alertInterval);
  alertSound.pause();
  alertSound.currentTime = 0;
  if (navigator.vibrate) navigator.vibrate(0);
  btnSilence.hidden = true;
});

btnCancel.addEventListener("click", async () => {
  btnCancel.disabled = true;
  statusEl.textContent = "Cancelando...";
  clearInterval(alertInterval);

  // Chama /cancelar?t=...
  const { url, opts } = fnUrl("cancelar", "POST", { clientId });
  await fetch(url, opts);

  clearInterval(polling);
  statusEl.textContent = "Você saiu da fila.";
  ticketEl.textContent = "–";
  statusEl.classList.remove("blink");
});
