/**
 * !autofriend — Auto-accept Facebook friend requests (on/off)
 * Also processes all currently pending friend requests when turned on
 * TEAM STARTCOPE BETA
 */

const fs   = require('fs-extra');
const path = require('path');
const bold = require('../../utils/bold');

const TEAM       = 'TEAM STARTCOPE BETA';
const STATE_FILE = path.join(process.cwd(), 'utils/data/autofriend_state.json');

// ── Persisted state ───────────────────────────────────────────────────────────
let state = { enabled: false, accepted: 0, startedAt: null };

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...s };
    }
  } catch {}
}

function saveState() {
  try {
    fs.ensureDirSync(path.dirname(STATE_FILE));
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

// ── Expose state globally so protection.js can check it ──────────────────────
function setGlobal() {
  global.autofriendEnabled = state.enabled;
}

// ── Accept a single friend request ───────────────────────────────────────────
function acceptRequest(api, uid) {
  return new Promise(resolve => {
    try {
      if (typeof api.respondToFriendRequest === 'function') {
        api.respondToFriendRequest(String(uid), true, (err) => {
          if (!err) {
            state.accepted++;
            saveState();
            console.log(`[AutoFriend] ✅ Accepted friend request from ${uid} (total: ${state.accepted})`);
          } else {
            console.log(`[AutoFriend] ⚠️ Could not accept ${uid}: ${err.message?.slice(0, 50)}`);
          }
          resolve();
        });
      } else {
        resolve();
      }
    } catch { resolve(); }
  });
}

// ── Process all pending friend requests ───────────────────────────────────────
async function processPendingRequests(api) {
  try {
    console.log('[AutoFriend] 🔍 Checking for pending friend requests...');

    // Method 1: Try getFriendRequestsList if it exists
    if (typeof api.getFriendRequestsList === 'function') {
      const pending = await new Promise((res, rej) =>
        api.getFriendRequestsList((err, list) => err ? rej(err) : res(list || []))
      );
      if (pending.length > 0) {
        console.log(`[AutoFriend] 📋 Found ${pending.length} pending requests — accepting all...`);
        for (const uid of pending) {
          await acceptRequest(api, uid);
          await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
        }
        return pending.length;
      }
    }

    // Method 2: Use GraphQL to get pending requests
    if (typeof api.httpGet === 'function' || typeof api.httpPost === 'function') {
      const form = {
        av:                        api.getCurrentUserID(),
        fb_api_caller_class:       'RelayModern',
        fb_api_req_friendly_name:  'FriendingCometFriendRequestsRootQuery',
        variables:                 JSON.stringify({ count: 50 }),
        server_timestamps:         'true',
        doc_id:                    '4869889479728',
      };

      const raw = await new Promise(resolve => {
        try {
          api.httpPost('https://www.facebook.com/api/graphql/', form, (e, body) => {
            resolve(body);
          });
        } catch { resolve(''); }
      });

      const uids = [];
      try {
        const parsed = JSON.parse(raw);
        const edges  = parsed?.data?.viewer?.friend_requests?.edges || [];
        for (const edge of edges) {
          const uid = edge?.node?.id;
          if (uid) uids.push(uid);
        }
      } catch {}

      if (uids.length) {
        console.log(`[AutoFriend] 📋 Found ${uids.length} pending requests via API — accepting...`);
        for (const uid of uids) {
          await acceptRequest(api, uid);
          await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
        }
        return uids.length;
      }
    }

    console.log('[AutoFriend] ✅ No pending requests found (or API method unavailable)');
    return 0;
  } catch (e) {
    console.error('[AutoFriend] ⚠️ Could not process pending requests:', e.message?.slice(0, 80));
    return 0;
  }
}

// ── Command config ────────────────────────────────────────────────────────────
module.exports.config = {
  name:            'autofriend',
  version:         '1.0.0',
  hasPermssion:    2,
  credits:         TEAM,
  description:     'Auto-accept Facebook friend requests on/off — also clears pending requests',
  commandCategory: 'Admin',
  usages:          '[on | off | status | pending]',
  cooldowns:       5,
  aliases:         ['af', 'friendauto']
};

module.exports.onLoad = function ({ api }) {
  loadState();
  setGlobal();
  if (state.enabled) {
    console.log(`[AutoFriend] ✅ Restored ON — auto-accepting incoming friend requests`);
    // Process any pending requests that came in while bot was offline
    setTimeout(() => processPendingRequests(api), 15000);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P   = global.config?.PREFIX || '!';
  const sub = (args[0] || '').toLowerCase();

  if (!sub || sub === 'help') {
    return api.sendMessage(
      `🤝 ${bold('AUTO FRIEND REQUEST')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${bold('Status:')} ${state.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `✅ ${bold('Total Accepted:')} ${state.accepted}\n` +
      (state.startedAt ? `🕐 ${bold('Since:')} ${new Date(state.startedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` : '') +
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 ${bold('COMMANDS:')}\n` +
      `• ${P}autofriend on       — I-start auto-accept\n` +
      `• ${P}autofriend off      — I-stop\n` +
      `• ${P}autofriend pending  — Accept all pending now\n` +
      `• ${P}autofriend status   — Check status\n\n` +
      `💡 Kapag ON: lahat ng mag-friend request sa bot ay auto-macoconfirm!\n` +
      `🔒 ${bold('Admin only')}\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  if (sub === 'on') {
    if (state.enabled) {
      return api.sendMessage(`⚠️ ${bold('Naka-ON na ang AutoFriend.')}`, threadID, messageID);
    }
    state.enabled   = true;
    state.startedAt = new Date().toISOString();
    saveState();
    setGlobal();

    api.sendMessage(
      `✅ ${bold('AUTO FRIEND REQUEST — ON!')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤝 Lahat ng bagong friend request ay auto-macoconfirm!\n` +
      `🔍 Checking pending requests...\n\n` +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );

    // Accept all pending in background
    const count = await processPendingRequests(api);
    if (count > 0) {
      api.sendMessage(
        `✅ ${bold('Pending requests processed!')}\n` +
        `🤝 Accepted ${bold(String(count))} pending friend request${count !== 1 ? 's' : ''}!`,
        threadID
      );
    }
    return;
  }

  if (sub === 'off') {
    if (!state.enabled) {
      return api.sendMessage(`⚠️ ${bold('Hindi naman naka-ON ang AutoFriend.')}`, threadID, messageID);
    }
    state.enabled = false;
    saveState();
    setGlobal();
    return api.sendMessage(
      `🛑 ${bold('AUTO FRIEND REQUEST — OFF!')}\n` +
      `📊 Total accepted: ${bold(String(state.accepted))}\n` +
      `💡 Hindi na mag-a-auto-accept ng friend requests.\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  if (sub === 'pending') {
    api.sendMessage(`🔍 ${bold('Processing all pending friend requests...')}`, threadID, messageID);
    const count = await processPendingRequests(api);
    return api.sendMessage(
      `✅ ${bold('Done!')}\n` +
      `🤝 Accepted ${bold(String(count))} pending request${count !== 1 ? 's' : ''}\n` +
      `📊 Total ever: ${bold(String(state.accepted))}\n🏷️ ${bold(TEAM)}`,
      threadID
    );
  }

  if (sub === 'status') {
    return api.sendMessage(
      `📊 ${bold('AUTOFRIEND STATUS')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${bold('State:')} ${state.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `✅ ${bold('Total Accepted:')} ${state.accepted}\n` +
      (state.startedAt ? `🕐 ${bold('Since:')} ${new Date(state.startedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` : '') +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  return api.sendMessage(`❌ Unknown option. Use: ${P}autofriend on/off/status/pending`, threadID, messageID);
};

// ── Export accept function for use in protection.js ───────────────────────────
module.exports.acceptRequest  = acceptRequest;
module.exports.getState       = () => state;
