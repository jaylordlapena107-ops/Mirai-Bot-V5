/**
 * ANTI-DETECT PROTECTION MODULE
 * Protects the Facebook session from being flagged or triggering
 * "new login" alerts in other browsers (flowsurf, etc.)
 *
 * Key strategies:
 * 1. Rotating browser-grade user agents on every API interaction
 * 2. Random human-like delays between outgoing messages
 * 3. Session keep-alive (prevents idle disconnect / re-login)
 * 4. Request rate limiting (prevents spam-pattern detection)
 * 5. Proper browser headers injected at MQTT / login level
 */

const BROWSER_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
];

// Pick a random user agent
function getRandomUA() {
  return BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)];
}

// Human-like random delay: 0.8s – 2.5s base, occasionally longer
function humanDelay(minMs = 800, maxMs = 2500) {
  const base = minMs + Math.random() * (maxMs - minMs);
  // 10% chance of a longer "thinking" pause (2.5s – 5s extra)
  const extra = Math.random() < 0.1 ? 2500 + Math.random() * 2500 : 0;
  return new Promise(r => setTimeout(r, base + extra));
}

// Rate limiter — ensures no more than N requests per window
class RateLimiter {
  constructor(maxPerWindow = 8, windowMs = 60000) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
    this.timestamps = [];
  }
  async throttle() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxPerWindow) {
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 100;
      await new Promise(r => setTimeout(r, waitMs));
      return this.throttle();
    }
    this.timestamps.push(now);
  }
}

// Global shared rate limiter (8 sends per minute)
const globalLimiter = new RateLimiter(8, 60000);

// Session keep-alive — sends a typing indicator every N minutes to keep MQTT alive
// This prevents Facebook from detecting a dead/bot connection and issuing re-logins
function startKeepAlive(api, intervalMs = 7 * 60 * 1000) {
  let tid = null;

  const tick = async () => {
    try {
      // Try to get the thread list as a keep-alive ping
      if (typeof api.getThreadList === 'function') {
        api.getThreadList(1, null, [], () => {});
      }
    } catch (e) { /* silent */ }
    tid = setTimeout(tick, intervalMs + Math.random() * 30000); // jitter ±30s
  };

  tid = setTimeout(tick, intervalMs);
  return () => { if (tid) clearTimeout(tid); };
}

// Wrap api.sendMessage with anti-detect delays + rate limiting
function wrapSendMessage(api) {
  const original = api.sendMessage.bind(api);
  api.sendMessage = async function (msg, threadID, callback, ...rest) {
    await globalLimiter.throttle();
    await humanDelay(600, 2000);
    return original(msg, threadID, callback, ...rest);
  };
  return api;
}

// Build browser-grade HTTP headers for login/API calls
function getBrowserHeaders() {
  return {
    'User-Agent': getRandomUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,fil;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
}

module.exports = {
  getRandomUA,
  humanDelay,
  RateLimiter,
  globalLimiter,
  startKeepAlive,
  wrapSendMessage,
  getBrowserHeaders,
};
