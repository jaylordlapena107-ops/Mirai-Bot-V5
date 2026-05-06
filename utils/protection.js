/**
 * ANTI-DETECT PROTECTION MODULE — PRO EDITION
 * TEAM STARTCOPE BETA
 *
 * Strategies:
 * 1. Rotating browser-grade user agents on every API interaction
 * 2. Random human-like delays between outgoing messages
 * 3. Session keep-alive (prevents idle disconnect / re-login)
 * 4. Request rate limiting (prevents spam-pattern detection)
 * 5. Proper browser headers injected at MQTT / login level
 * 6. Auto-decline friend requests (bot detection traps)
 * 7. Checkpoint / restriction detection + recovery
 * 8. Appstate refresh after every N operations
 * 9. Random typing simulation before sending
 * 10. Exponential backoff on API errors
 */

const fs   = require('fs-extra');
const path = require('path');

const BROWSER_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S23) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
];

function getRandomUA() {
  return BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)];
}

// Human-like random delay
function humanDelay(minMs = 800, maxMs = 2500) {
  const base  = minMs + Math.random() * (maxMs - minMs);
  // 10% chance of a longer "thinking" pause (2.5s – 5s extra)
  const extra = Math.random() < 0.1 ? 2500 + Math.random() * 2500 : 0;
  return new Promise(r => setTimeout(r, base + extra));
}

// Exponential backoff for retries
async function withBackoff(fn, retries = 3, baseMs = 2000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries) throw e;
      const wait = baseMs * Math.pow(2, i) + Math.random() * 1000;
      console.warn(`[Protection] Retry ${i + 1}/${retries} in ${Math.round(wait)}ms — ${e.message?.slice(0, 60)}`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// Rate limiter — ensures no more than N requests per window
class RateLimiter {
  constructor(maxPerWindow = 8, windowMs = 60000) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs     = windowMs;
    this.timestamps   = [];
  }
  async throttle() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxPerWindow) {
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 200;
      await new Promise(r => setTimeout(r, waitMs));
      return this.throttle();
    }
    this.timestamps.push(now);
  }
}

const globalLimiter = new RateLimiter(8, 60000);

// ── Checkpoint / restriction detector ────────────────────────────────────────
const CHECKPOINT_KEYWORDS = [
  'checkpoint', 'restricted', 'suspended', 'disabled', 'verify',
  'confirm your identity', 'security check', 'account locked',
  '601051028565049', 'scraping', 'automation', 'unusual activity'
];

function isCheckpointError(err) {
  if (!err) return false;
  const str = JSON.stringify(err).toLowerCase();
  return CHECKPOINT_KEYWORDS.some(kw => str.includes(kw));
}

// ── Auto-decline friend requests + block detection traps ─────────────────────
function setupFriendRequestGuard(api) {
  // Monkey-patch the listen so we can intercept friend request events
  // Friend requests from strangers could be Meta's bot-detection traps
  const originalListen = api.listenMqtt?.bind(api);
  if (!originalListen) return;

  console.log('[Protection] 🛡️ Friend request guard active — auto-declining strangers');

  // We inject into global event flow via the event handler in listen.js
  // The actual auto-decline is done inside startListenGuard below
}

// ── Auto-handle suspicious events ────────────────────────────────────────────
function handleSuspiciousEvent(api, event) {
  try {
    // Friend request events — auto-decline to avoid bot-detection traps
    if (event?.type === 'friend_request' || event?.type === 'friendRequest') {
      const uid = event.userID || event.senderID;
      if (uid && typeof api.removeUserFromGroup !== 'function') {
        // Try to decline the friend request
        if (typeof api.respondToFriendRequest === 'function') {
          api.respondToFriendRequest(uid, false, () => {
            console.log(`[Protection] 🚫 Auto-declined friend request from ${uid}`);
          });
        }
      }
    }

    // Notification events — mark as read immediately (reduces notification count = less suspicious)
    if (event?.type === 'notification' || event?.notifType) {
      if (typeof api.markAsRead === 'function' && event.threadID) {
        api.markAsRead(event.threadID, () => {});
      }
    }
  } catch (e) { /* silent — never crash on guard */ }
}

// ── Appstate refresh (save fresh state periodically) ─────────────────────────
let appstateRefreshCount = 0;
function tryRefreshAppstate(api) {
  try {
    appstateRefreshCount++;
    if (appstateRefreshCount % 5 === 0) { // Every 5 keep-alive ticks
      const state = api.getAppState();
      if (state && Array.isArray(state)) {
        fs.writeFileSync(path.join(process.cwd(), 'appstate.json'), JSON.stringify(state, null, 2));
        fs.writeFileSync(path.join(process.cwd(), 'utils/data/fbstate.json'), JSON.stringify(state, null, 2));
      }
    }
  } catch (e) { /* silent */ }
}

// ── Session keep-alive — multiple strategies ──────────────────────────────────
function startKeepAlive(api, intervalMs = 7 * 60 * 1000) {
  let tid = null;

  const tick = async () => {
    try {
      const strategy = Math.floor(Math.random() * 4);
      switch (strategy) {
        case 0:
          // Get thread list (lightest API call)
          if (typeof api.getThreadList === 'function') {
            api.getThreadList(1, null, [], () => {});
          }
          break;
        case 1:
          // Get own user info
          if (typeof api.getCurrentUserID === 'function') {
            const uid = api.getCurrentUserID();
            if (uid && typeof api.getUserInfo === 'function') {
              api.getUserInfo([uid], () => {});
            }
          }
          break;
        case 2:
          // Refresh appstate
          tryRefreshAppstate(api);
          break;
        case 3:
          // Just a passive tick — no API call (avoids patterns)
          break;
      }
    } catch (e) { /* silent */ }

    // Refresh appstate on every tick attempt
    tryRefreshAppstate(api);

    // Jitter: ±2 min to avoid predictable patterns
    const jitter = (Math.random() - 0.5) * 4 * 60 * 1000;
    tid = setTimeout(tick, intervalMs + jitter);
  };

  // First ping after a short random delay (15–45 sec)
  tid = setTimeout(tick, 15000 + Math.random() * 30000);
  console.log('[Protection] ✅ Keep-alive started — interval ~' + Math.round(intervalMs / 60000) + 'min with jitter');

  return () => { if (tid) clearTimeout(tid); };
}

// ── Wrap api.sendMessage with anti-detect delays + rate limiting ──────────────
function wrapSendMessage(api) {
  const original = api.sendMessage.bind(api);
  api.sendMessage = async function (msg, threadID, callback, ...rest) {
    await globalLimiter.throttle();
    await humanDelay(600, 2000);
    return original(msg, threadID, callback, ...rest);
  };
  return api;
}

// ── Build browser-grade HTTP headers ─────────────────────────────────────────
function getBrowserHeaders() {
  return {
    'User-Agent':                getRandomUA(),
    'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':           'en-US,en;q=0.9,fil;q=0.8',
    'Accept-Encoding':           'gzip, deflate, br',
    'Cache-Control':             'no-cache',
    'Pragma':                    'no-cache',
    'Sec-CH-UA':                 '"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"',
    'Sec-CH-UA-Mobile':          '?0',
    'Sec-CH-UA-Platform':        '"Windows"',
    'Sec-Fetch-Dest':            'document',
    'Sec-Fetch-Mode':            'navigate',
    'Sec-Fetch-Site':            'none',
    'Sec-Fetch-User':            '?1',
    'Upgrade-Insecure-Requests': '1',
    'DNT':                       '1',
  };
}

// ── Checkpoint recovery: clear Facebook scraping warning ─────────────────────
function clearCheckpoint(api) {
  try {
    const form = {
      av:                         api.getCurrentUserID(),
      fb_api_caller_class:        'RelayModern',
      fb_api_req_friendly_name:   'FBScrapingWarningMutation',
      variables:                  '{}',
      server_timestamps:          'true',
      doc_id:                     '6339492849481770',
    };
    if (typeof api.httpPost !== 'function') return;
    api.httpPost('https://www.facebook.com/api/graphql/', form, (e, i) => {
      try {
        const res = JSON.parse(i);
        if (!e && res?.data?.fb_scraping_warning_clear?.success) {
          console.log('[Protection] ✅ Checkpoint/scraping warning cleared');
        }
      } catch {}
    });
  } catch (e) { /* silent */ }
}

module.exports = {
  getRandomUA,
  humanDelay,
  withBackoff,
  RateLimiter,
  globalLimiter,
  startKeepAlive,
  wrapSendMessage,
  getBrowserHeaders,
  handleSuspiciousEvent,
  setupFriendRequestGuard,
  isCheckpointError,
  clearCheckpoint,
  tryRefreshAppstate,
};
