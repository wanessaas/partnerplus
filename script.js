const targetPoints = 300;
let currentPoints = 0;

const CLIENT_ID = '2peh3yn0ugwp2l1k5w2fi3h5m1ma1v'; // Seu Client ID
const CLIENT_SECRET = '8c26wr5ifklhwenivohwm9a1s0crr4'; // Seu Client Secret
const CHANNEL_NAME = 'wanessa'; // Nome do seu canal
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjaXRhZGVsIiwiZXhwIjoxNzQwMDc2ODg3LCJqdGkiOiI1OTJhMmEzMi05N2IyLTQzNzUtODg0NS0wYzk1MzNiNmVmZDMiLCJjaGFubmVsIjoiNWE3YzlmMjg2OTI1MzIwMDAxMTQ5YWM5Iiwicm9sZSI6Im93bmVyIiwiYXV0aFRva2VuIjoiNk8wa3hIN3F6VlgxeDNDVDhPeHYiLCJ1c2VyIjoiNWE3YzlmMjg2OTI1MzIwMDAxMTQ5YWM4IiwidXNlcl9pZCI6IjZjNGEyZmQ5LTI4OGQtNDEyYi05YzQyLWQ1NWRlMzBjYzBhZCIsInVzZXJfcm9sZSI6ImNyZWF0b3IiLCJwcm92aWRlciI6InR3aXRjaCIsInByb3ZpZGVyX2lkIjoiNzY0MjQ4MjAiLCJjaGFubmVsX2lkIjoiOTYzMzNjYjktZWJhZC00MTU5LWI2ODItOTUyZDFmMWNjMzY1IiwiY3JlYXRvcl9pZCI6IjJhYzY5NTZjLTZlMDItNDM5YS04MzBiLWFjZDdhNzRhM2VhOCJ9.HtgjWYmewMmrn0BWeizohI2KwbI-xV8LUeN8_b14JnA'; // Seu JWT Token

// Função para obter o token de acesso OAuth
async function getAccessToken() {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'channel:read:subscriptions'
    })
  });

  const data = await response.json();
  return data.access_token;
}

// Função para obter o ID do canal pelo nome
async function getChannelIdByName(accessToken) {
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${CHANNEL_NAME}`, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const data = await response.json();
  console.log(data);

  if (data.data && data.data.length > 0) {
    return data.data[0].id; // Retorna o ID do canal
  } else {
    console.error('Canal não encontrado.');
    return null;
  }
}

// Função para obter o número atual de inscrições
async function fetchCurrentSubs(channelId, accessToken) {
  const response = await fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${channelId}`, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  console.log(data); // Verifique a estrutura dos dados retornados e ajuste conforme necessário

  // Filtra apenas os subs Tier 1, 2 e 3 e ignora Prime e Gift Subs
  const subs = data.data.filter(sub => sub.tier && !sub.is_gift && !sub.is_prime);

  // Contagem de subs por tier
  const tierCounts = {
    tier1: subs.filter(sub => sub.tier === '1').length,
    tier2: subs.filter(sub => sub.tier === '2').length,
    tier3: subs.filter(sub => sub.tier === '3').length
  };

  return tierCounts;
}

// Função para calcular pontos com base nos tiers de inscrição
function calculatePoints(tier) {
  if (tier === '1') {
    currentPoints += 1;
  } else if (tier === '2') {
    currentPoints += 2;
  } else if (tier === '3') {
    currentPoints += 6;
  }
  updateCounter();
}

// Função para atualizar a exibição do contador
function updateCounter() {
  document.getElementById('meta').innerText = `${currentPoints}/${targetPoints}`;
}

// Inicializa o contador com dados reais
async function initializeCounter() {
  const accessToken = await getAccessToken();
  const channelId = await getChannelIdByName(accessToken);
  if (channelId) {
    const subsData = await fetchCurrentSubs(channelId, accessToken);
    currentPoints = (subsData.tier1 * 1) + (subsData.tier2 * 2) + (subsData.tier3 * 6);
    updateCounter();
  }
}

// Conexão WebSocket com StreamElements
const socket = new WebSocket('wss://socket.streamelements.com');

socket.onopen = () => {
  console.log('WebSocket connection opened.');
  // Substitua pelo seu token JWT real
  socket.send(JSON.stringify({
    type: 'authentication',
    secret: JWT_TOKEN
  }));
  socket.send(JSON.stringify({
    type: 'event',
    event: 'sub'
  }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'event' && data.data.type === 'subscription') {
    const tier = data.data.tier;
    // Só conta se o tipo de sub não for Prime e não for Gift
    if (!data.data.is_prime && !data.data.is_gift) {
      calculatePoints(tier);
    }
  }
};

// Inicializa o contador ao carregar o script
initializeCounter();
