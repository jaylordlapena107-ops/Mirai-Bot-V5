const bold = require('../../utils/bold');
const fs = require('fs-extra');
const path = require('path');

const TEAM = 'TEAM STARTCOPE BETA';
const INTERVAL_MS = 4 * 60 * 1000; // every 4 minutes
const STREAM_URL = 'https://hrmanila.radioca.st/stream';
const STATE_FILE = path.join(process.cwd(), 'utils/data/friendpromo_state.json');
fs.ensureDirSync(path.dirname(STATE_FILE));

const PROMO_MESSAGES = [
  `📻 ${bold('KA 95.1 HOME RADIO NAGA')}\n\n` +
  `🎙️ ${bold('GUSTO MOBA PAKINGGAN ANG HOME RADIO NAGA?')}\n\n` +
  `🌟 ${bold('ANG PAGBABALIK NGAYON 2026!')}\n` +
  `📍 ${bold('NASA GAWAD KALINGA NA')}\n` +
  `🔴 ${bold('ONLINE LIVE SA MOR NAGA')}\n\n` +
  `🎵 I-click para makinig ng LIVE:\n${STREAM_URL}\n\n` +
  `📡 Libre! Walang bayad! 24/7 LIVE!\n` +
  `🏷️ ${bold(TEAM)}`,

  `🔴 ${bold('HOME RADIO 95.1 NAGA — LIVE NA!')}\n\n` +
  `🎙️ ${bold('KA, PAKINGGAN MO NA ANG HOME RADIO NAGA!')}\n\n` +
  `📍 ${bold('GAWAD KALINGA, NAGA CITY')}\n` +
  `🌟 ${bold('BUMALIK NA KAMI — 2026 ANG AMING TAON!')}\n` +
  `🎵 MOR NAGA — ${bold('ONLINE LIVE')}\n\n` +
  `👉 ${STREAM_URL}\n\n` +
  `📡 I-tap lang, libre at live!\n` +
  `🏷️ ${bold(TEAM)}`,

  `🎶 ${bold('MOR NAGA — HOME RADIO 95.1')}\n\n` +
  `Ka, kumusta ka? 😊\n` +
  `${bold('IPAALAM KO LANG SA IYO...')}\n\n` +
  `🔴 ${bold('HOME RADIO 95.1 NAGA')} ay LIVE na online!\n` +
  `📍 ${bold('NASA GAWAD KALINGA NA KAMI')}\n` +
  `🌟 ${bold('2026 — ANG PAGBABALIK!')}\n\n` +
  `🎵 Makinig ka na dito:\n${STREAM_URL}\n\n` +
  `💛 Salamat sa inyong suporta!\n` +
  `🏷️ ${bold(TEAM)}`,
];

let promoInterval = null;
let promoApi = null;
let sentLog = {};

function loadSentLog() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return {};
}
function saveSentLog() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(sentLog, null, 2)); } catch {}
}

function getMsg() {
  return PROMO_MESSAGES[Math.floor(Math.random() * PROMO_MESSAGES.length)];
}

async function sendToAllFriends() {
  if (!promoApi) return;
  try {
    const friendsList = await new Promise((res, rej) => {
      promoApi.getFriendsList((err, data) => err ? rej(err) : res(data));
    });
    if (!friendsList || !friendsList.length) {
      console.log('[FriendPromo] No friends found.');
      return;
    }
    console.log(`[FriendPromo] Sending promo to ${friendsList.length} friends...`);
    for (const friend of friendsList) {
      const uid = String(friend.userID || friend.uid || friend.vanity);
      if (!uid || uid === 'undefined') continue;
      try {
        await new Promise(r => setTimeout(r, 1200)); // 1.2s delay between sends (anti-spam)
        await new Promise((res, rej) => {
          promoApi.sendMessage(getMsg(), uid, err => err ? rej(err) : res());
        });
        sentLog[uid] = new Date().toISOString();
        console.log(`[FriendPromo] ✅ Sent to ${friend.name || uid}`);
      } catch (e) {
        console.error(`[FriendPromo] ❌ Failed for ${friend.name || uid}:`, e.message?.slice(0, 80));
      }
    }
    saveSentLog();
    console.log(`[FriendPromo] ✅ Done sending to all friends.`);
  } catch (e) {
    console.error('[FriendPromo] Error getting friends list:', e.message?.slice(0, 150));
  }
}

function scheduleNext() {
  promoInterval = setTimeout(async () => {
    await sendToAllFriends();
    scheduleNext();
  }, INTERVAL_MS);
}

module.exports.config = {
  name: 'friendpromo',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'Auto-sends Home Radio 95.1 Naga promo to ALL friends every 4 minutes',
  eventType: [],
};

module.exports.onLoad = function ({ api }) {
  promoApi = api;
  sentLog = loadSentLog();
  if (promoInterval) clearTimeout(promoInterval);
  // First send after 30 seconds (give bot time to fully connect)
  setTimeout(async () => {
    await sendToAllFriends();
    scheduleNext();
  }, 30000);
  console.log('[FriendPromo] ✅ Auto-friend promo started — every 4 minutes to ALL friends');
};

module.exports.run = async function () {};
