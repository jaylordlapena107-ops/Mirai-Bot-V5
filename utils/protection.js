/**
 * ANTI-DETECT PROTECTION MODULE — PRO EDITION v2.0
 * TEAM STARTCOPE BETA
 *
 * 12-Layer Protection System:
 * 1.  Rotating browser-grade user agents (13 real UAs)
 * 2.  Human-like random delays (multi-layer with "thinking" pauses)
 * 3.  Session keep-alive with 4 rotating strategies
 * 4.  Request rate limiting (max 8 sends/min global throttle)
 * 5.  Browser-grade HTTP headers (12 Sec-Fetch/Sec-CH-UA headers)
 * 6.  Auto-decline friend requests (bot-detection trap avoidance)
 * 7.  Checkpoint/restriction detection + 30min backoff recovery
 * 8.  Appstate refresh (every 5 ticks + after every post)
 * 9.  Typing indicator simulation before sending
 * 10. Exponential backoff on API errors (up to 30 min)
 * 11. Session fingerprint randomization (per-session unique headers)
 * 12. Background behavior randomizer (reads, scrolls, profile views)
 */

const fs   = require('fs-extra');
const path = require('path');

// ── 13 Real Chrome/Firefox/Safari/Edge/Mobile UAs ────────────────────────────
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

// Per-session UA — stays stable for the session (like a real browser)
const SESSION_UA = BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)];

function getRandomUA() {
  return BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)];
}

function getSessionUA() { return SESSION_UA; }

// ── Session fingerprint (randomized per process start) ────────────────────────
const SESSION_FINGERPRINT = {
  screenWidth:  [1280, 1366, 1440, 1600, 1920, 2560][Math.floor(Math.random() * 6)],
  screenHeight: [720, 768, 900, 1080, 1200][Math.floor(Math.random() * 5)],
  colorDepth:   [24, 32][Math.floor(Math.random() * 2)],
  timezone:     'Asia/Manila',
  language:     ['en-US', 'en-PH'][Math.floor(Math.random() * 2)],
  platform:     ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)],
};

// ── Human-like random delays ──────────────────────────────────────────────────
function humanDelay(minMs = 800, maxMs = 2500) {
  const base  = minMs + Math.random() * (maxMs - minMs);
  // 12% chance of a "thinking" pause (2–6s extra)
  const extra = Math.random() < 0.12 ? 2000 + Math.random() * 4000 : 0;
  // 3% chance of a very long pause (simulates distraction — 6–15s)
  const distract = Math.random() < 0.03 ? 6000 + Math.random() * 9000 : 0;
  return new Promise(r => setTimeout(r, base + extra + distract));
}

// Short delay between rapid actions (scroll/read simulation)
function microDelay() {
  return new Promise(r => setTimeout(r, 200 + Math.random() * 600));
}

// ── Exponential backoff for retries ──────────────────────────────────────────
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

// ── Rate limiter — max N requests per window ──────────────────────────────────
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
      const waitMs = this.windowMs - (now - oldest) + 300;
      await new Promise(r => setTimeout(r, waitMs));
      return this.throttle();
    }
    this.timestamps.push(now);
  }
}

const globalLimiter = new RateLimiter(8, 60000);

// ── Checkpoint / restriction keywords ────────────────────────────────────────
const CHECKPOINT_KEYWORDS = [
  'checkpoint', 'restricted', 'suspended', 'disabled', 'verify',
  'confirm your identity', 'security check', 'account locked',
  '601051028565049', 'scraping', 'automation', 'unusual activity',
  'temporarily blocked', 'account has been', 'policy violation',
  'action blocked', '408', 'parseandchecklogin',
];

function isCheckpointError(err) {
  if (!err) return false;
  const str = JSON.stringify(err).toLowerCase();
  return CHECKPOINT_KEYWORDS.some(kw => str.includes(kw));
}

// ── Stats tracker ─────────────────────────────────────────────────────────────
const stats = {
  friendRequestsDeclined: 0,
  checkpointsCleared:     0,
  keepAliveTicks:         0,
  appstateRefreshes:      0,
  typingSimulations:      0,
  behaviorEvents:         0,
  startedAt:              new Date().toISOString(),
};

// ── Typing indicator simulation ───────────────────────────────────────────────
function simulateTyping(api, threadID, durationMs = 1500) {
  try {
    if (typeof api.sendTypingIndicator !== 'function') return Promise.resolve();
    stats.typingSimulations++;
    return new Promise(resolve => {
      api.sendTypingIndicator(threadID, (err, stop) => {
        setTimeout(() => {
          try { if (stop) stop(); } catch {}
          resolve();
        }, durationMs + Math.random() * 500);
      });
    });
  } catch { return Promise.resolve(); }
}

// ── Auto-decline friend requests + suspicious event handler ──────────────────
function setupFriendRequestGuard(api) {
  console.log('[Protection] 🛡️ Friend request guard active — auto-declining strangers');
}

function handleSuspiciousEvent(api, event) {
  try {
    // Friend request — auto-decline (Meta's bot-detection traps)
    if (event?.type === 'friend_request' || event?.type === 'friendRequest') {
      const uid = event.userID || event.senderID;
      if (uid && typeof api.respondToFriendRequest === 'function') {
        api.respondToFriendRequest(uid, false, () => {
          stats.friendRequestsDeclined++;
          console.log(`[Protection] 🚫 Friend request auto-declined: ${uid} (total: ${stats.friendRequestsDeclined})`);
        });
      }
      return;
    }

    // Notification — mark read immediately (reduces suspicious signals)
    if (event?.type === 'notification' || event?.notifType) {
      if (typeof api.markAsRead === 'function' && event.threadID) {
        api.markAsRead(event.threadID, () => {});
      }
      return;
    }

    // Unknown event types — log and ignore
    if (event?.type && !['message', 'message_reply', 'typ', 'read', 'read_receipt', 'presence'].includes(event.type)) {
      console.log(`[Protection] 🔍 Unknown event type: ${event.type} — monitoring`);
    }
  } catch { /* silent — never crash */ }
}

// ── Appstate refresh ──────────────────────────────────────────────────────────
let _appstateRefreshCount = 0;
function tryRefreshAppstate(api) {
  try {
    _appstateRefreshCount++;
    if (_appstateRefreshCount % 5 === 0) {
      const state = api.getAppState();
      if (state && Array.isArray(state)) {
        fs.writeFileSync(path.join(process.cwd(), 'appstate.json'), JSON.stringify(state, null, 2));
        fs.writeFileSync(path.join(process.cwd(), 'utils/data/fbstate.json'), JSON.stringify(state, null, 2));
        stats.appstateRefreshes++;
      }
    }
  } catch { /* silent */ }
}

// ── Background behavior randomizer ───────────────────────────────────────────
// Simulates human browsing: reads threads, views profiles, etc.
function startBehaviorRandomizer(api) {
  const behaviors = [
    // View thread list (simulates scrolling feed)
    () => {
      if (typeof api.getThreadList === 'function') {
        api.getThreadList(Math.ceil(Math.random() * 5) + 1, null, [], () => {});
      }
    },
    // Mark random messages as read (simulates reading)
    () => {
      if (typeof api.markAsDelivered === 'function' && global.client?.currentMsgData?.threadID) {
        api.markAsDelivered(global.client.currentMsgData.threadID, global.client.currentMsgData.messageID || '0', () => {});
      }
    },
    // Get own user info (profile view)
    () => {
      if (typeof api.getUserInfo === 'function' && typeof api.getCurrentUserID === 'function') {
        const uid = api.getCurrentUserID();
        if (uid) api.getUserInfo([uid], () => {});
      }
    },
    // Passive — just a heartbeat tick (no API call)
    () => { stats.behaviorEvents++; },
  ];

  function scheduleBehavior() {
    const delay = 3 * 60 * 1000 + Math.random() * 7 * 60 * 1000; // 3–10 min random
    setTimeout(() => {
      try {
        const fn = behaviors[Math.floor(Math.random() * behaviors.length)];
        fn();
        stats.behaviorEvents++;
      } catch {}
      scheduleBehavior(); // reschedule
    }, delay);
  }

  scheduleBehavior();
  console.log('[Protection] 🎭 Behavior randomizer active — simulating human browsing');
}

// ── Session keep-alive — 4 rotating strategies ────────────────────────────────
function startKeepAlive(api, intervalMs = 7 * 60 * 1000) {
  let tid = null;

  const tick = async () => {
    try {
      stats.keepAliveTicks++;
      const strategy = Math.floor(Math.random() * 4);
      switch (strategy) {
        case 0:
          // Get thread list (lightest call)
          if (typeof api.getThreadList === 'function') {
            api.getThreadList(1, null, [], () => {});
          }
          break;
        case 1:
          // Get own user info (profile check)
          if (typeof api.getCurrentUserID === 'function') {
            const uid = api.getCurrentUserID();
            if (uid && typeof api.getUserInfo === 'function') {
              api.getUserInfo([uid], () => {});
            }
          }
          break;
        case 2:
          // Refresh appstate (session cookie renewal)
          tryRefreshAppstate(api);
          break;
        case 3:
          // Passive tick — no API call (avoids rhythm patterns)
          break;
      }
    } catch { /* silent */ }

    // Always attempt appstate refresh on every tick
    tryRefreshAppstate(api);

    // Jitter: ±2.5 min to break any predictable interval
    const jitter = (Math.random() - 0.5) * 5 * 60 * 1000;
    tid = setTimeout(tick, intervalMs + jitter);
  };

  // First ping after random 15–45 sec
  tid = setTimeout(tick, 15000 + Math.random() * 30000);
  console.log('[Protection] ✅ Keep-alive started — interval ~' + Math.round(intervalMs / 60000) + 'min with jitter');

  return () => { if (tid) clearTimeout(tid); };
}

// ── Wrap sendMessage with typing sim + rate limit + human delay ───────────────
function wrapSendMessage(api) {
  const original = api.sendMessage.bind(api);
  api.sendMessage = async function (msg, threadID, callback, ...rest) {
    await globalLimiter.throttle();

    // Simulate typing for text messages (not attachments-only)
    const hasText = typeof msg === 'string' || (msg?.body && msg.body.length > 0);
    if (hasText && threadID) {
      const typingMs = Math.min(1000 + (typeof msg === 'string' ? msg : msg.body).length * 18, 3500);
      await simulateTyping(api, threadID, typingMs).catch(() => {});
    }

    await humanDelay(400, 1200);
    return original(msg, threadID, callback, ...rest);
  };
  return api;
}

// ── Browser-grade HTTP headers ────────────────────────────────────────────────
function getBrowserHeaders() {
  const ua = SESSION_UA;
  const isChrome = ua.includes('Chrome') && !ua.includes('Edg');
  const isEdge   = ua.includes('Edg/');
  const isFF     = ua.includes('Firefox');

  return {
    'User-Agent':                ua,
    'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':           `${SESSION_FINGERPRINT.language},en;q=0.9,fil;q=0.8`,
    'Accept-Encoding':           'gzip, deflate, br, zstd',
    'Cache-Control':             'no-cache',
    'Pragma':                    'no-cache',
    'Sec-CH-UA':                 isEdge
      ? `"Microsoft Edge";v="124", "Chromium";v="124", "Not-A.Brand";v="99"`
      : isChrome
      ? `"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"`
      : `"Not-A.Brand";v="8"`,
    'Sec-CH-UA-Mobile':          ua.includes('Mobile') ? '?1' : '?0',
    'Sec-CH-UA-Platform':        `"${SESSION_FINGERPRINT.platform.includes('Win') ? 'Windows' : SESSION_FINGERPRINT.platform.includes('Mac') ? 'macOS' : 'Linux'}"`,
    'Sec-Fetch-Dest':            'document',
    'Sec-Fetch-Mode':            'navigate',
    'Sec-Fetch-Site':            'none',
    'Sec-Fetch-User':            '?1',
    'Upgrade-Insecure-Requests': '1',
    'DNT':                       '1',
    'Connection':                'keep-alive',
  };
}

// ── Checkpoint recovery ───────────────────────────────────────────────────────
function clearCheckpoint(api) {
  try {
    const form = {
      av:                        api.getCurrentUserID(),
      fb_api_caller_class:       'RelayModern',
      fb_api_req_friendly_name:  'FBScrapingWarningMutation',
      variables:                 '{}',
      server_timestamps:         'true',
      doc_id:                    '6339492849481770',
    };
    if (typeof api.httpPost !== 'function') return;
    api.httpPost('https://www.facebook.com/api/graphql/', form, (e, i) => {
      try {
        const res = JSON.parse(i);
        if (!e && res?.data?.fb_scraping_warning_clear?.success) {
          stats.checkpointsCleared++;
          console.log(`[Protection] ✅ Checkpoint cleared (total: ${stats.checkpointsCleared})`);
        }
      } catch {}
    });
  } catch { /* silent */ }
}

// ── Get protection status (for !protection command) ───────────────────────────
function getStats() { return { ...stats }; }

module.exports = {
  getRandomUA,
  getSessionUA,
  SESSION_FINGERPRINT,
  humanDelay,
  microDelay,
  withBackoff,
  RateLimiter,
  globalLimiter,
  startKeepAlive,
  startBehaviorRandomizer,
  wrapSendMessage,
  getBrowserHeaders,
  handleSuspiciousEvent,
  setupFriendRequestGuard,
  isCheckpointError,
  clearCheckpoint,
  simulateTyping,
  tryRefreshAppstate,
  getStats,
  CHECKPOINT_KEYWORDS,
};
