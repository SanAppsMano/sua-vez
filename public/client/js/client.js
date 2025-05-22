// public/client/js/client.js

const TICKET_KEY    = 'suaVez_ticket';
const NEEDS_JOIN    = 'suaVez_needsJoin';
const CLIENT_ID_KEY = 'suaVez_clientId';

// Captura o tenantId da URL
const urlParams   = new URL(location).searchParams;
const tenantId    = urlParams.get("t");

// elementos
const ticketEl    = document.getElementById("ticket");
const statusEl    = document.getElementById("status");
const btnCancel   = document.getElementById("btn-cancel");
const btnSilence  = document.getElementById("btn-silence");
const btnStart    = document.getElementById("btn-start");
const overlay     = document.getElementById("overlay");
const alertSound  = document.getElementById("alert-sound");

let polling, alertInterval, lastEventTs = 0, silenced = false;

// Funções de rede
async function fetchNovaSenha() {
const res = await fetch(/.netlify/functions/entrar?t=${tenantId});
if (!res.ok) throw new Error('Erro ao obter senha');
return res.json(); // { clientId, ticketNumber }
}

async function fetchStatus() {
const res = await fetch(/.netlify/functions/status?t=${tenantId});
if (!res.ok) throw new Error('Erro ao obter status');
return res.json();
}

async function fetchCancelamento(clientId) {
await fetch(/.netlify/functions/cancelar?t=${tenantId}, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ clientId })
});
}

// Exibe o ticket e estado
function mostrarTicket(ticketNumber) {
ticketEl.textContent = ticketNumber;
}
function mostrarStatus(text) {
statusEl.textContent = text;
}

// Inicializa a UI com dados do storage
function bootstrap() {
const storedTicket = localStorage.getItem(TICKET_KEY);
const storedClient = localStorage.getItem(CLIENT_ID_KEY);
if (storedTicket && storedClient) {
mostrarTicket(storedTicket);
btnCancel.disabled = false;
btnStart.hidden = true;
overlay.remove();
polling = setInterval(checkStatus, 2000);
}
}

// Entrar na fila
async function entrarNaFila() {
localStorage.removeItem(TICKET_KEY);
localStorage.removeItem(CLIENT_ID_KEY);
localStorage.setItem(NEEDS_JOIN, 'true');
try {
const { clientId, ticketNumber } = await fetchNovaSenha();
localStorage.setItem(TICKET_KEY, ticketNumber);
localStorage.setItem(CLIENT_ID_KEY, clientId);
localStorage.removeItem(NEEDS_JOIN);
mostrarTicket(ticketNumber);
mostrarStatus('Aguardando chamada...');
btnCancel.disabled = false;
btnStart.hidden = true;
overlay.remove();
polling = setInterval(checkStatus, 2000);
} catch {
// manter NEEDS_JOIN para retry
}
}

// Verifica status
async function checkStatus() {
const ticketNumber = localStorage.getItem(TICKET_KEY);
const clientId     = localStorage.getItem(CLIENT_ID_KEY);
if (!ticketNumber) return;
try {
const { currentCall, timestamp, attendant } = await fetchStatus();
if (currentCall !== Number(ticketNumber)) {
mostrarStatus(Chamando: ${currentCall} (${attendant}));
statusEl.classList.remove("blink");
} else {
mostrarStatus(É a sua vez! (Atendente: ${attendant}));
statusEl.classList.add("blink");
if (timestamp > lastEventTs) {
lastEventTs = timestamp;
silenced = false;
alertUser();
}
}
} catch {
// ignorar falhas de polling
}
}

// Alerta do usuário
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

// Desistir da fila
async function desistirDaFila() {
clearInterval(polling);
clearInterval(alertInterval);
silenced = true;
btnSilence.hidden = true;
btnCancel.disabled = true;
mostrarStatus('Cancelando...');

const clientId = localStorage.getItem(CLIENT_ID_KEY);
if (clientId) await fetchCancelamento(clientId);

localStorage.removeItem(TICKET_KEY);
localStorage.removeItem(CLIENT_ID_KEY);
localStorage.removeItem(NEEDS_JOIN);

mostrarTicket('–');
mostrarStatus('Você saiu da fila.');
}

// Sincroniza ao voltar online
function syncEstadoCliente() {
const needsJoin = localStorage.getItem(NEEDS_JOIN);
if (needsJoin) {
entrarNaFila();
}
}

// Eventos
btnStart.addEventListener('click', () => entrarNaFila());
btnSilence.addEventListener('click', () => { silenced = true; clearInterval(alertInterval); btnSilence.hidden = true; });
btnCancel.addEventListener('click', () => desistirDaFila());

window.addEventListener('offline', () => {
mostrarStatus('Sem conexão – tentando reconectar...');
});
window.addEventListener('online', () => {
mostrarStatus('Conectado');
syncEstadoCliente();
});
window.addEventListener('beforeunload', e => {
if (localStorage.getItem(TICKET_KEY)) {
const msg = 'Se você sair ou atualizar, perderá sua senha atual. Tem certeza?';
e.returnValue = msg;
return msg;
}
});

document.addEventListener('DOMContentLoaded', bootstrap);

