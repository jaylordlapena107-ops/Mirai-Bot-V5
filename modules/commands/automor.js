/**
 * !automor — Auto-posts live Philippines news every 4 minutes, 24/7
 * Sources: PhilStar, Rappler, USGS Earthquakes — FREE, no API key
 * Video news: yt-dlp YouTube search (GMA News / ABS-CBN)
 * Commands: !automor on | off | status
 */

const fs       = require('fs-extra');
const path     = require('path');
const axios    = require('axios');
const { exec } = require('child_process');
const bold     = require('../../utils/bold');

const VERSION  = '1.0.0';
const TEAM     = 'TEAM STARTCOPE BETA';
const INTERVAL = 4 * 60 * 1000; // 4 minutes — walang tigil 24/7

// ── Paths ────────────────────────────────────────────────────────────────────
const DATA_DIR   = path.join(process.cwd(), 'utils/data');
const STATE_FILE = path.join(DATA_DIR, 'automor_state.json');
const SEEN_FILE  = path.join(DATA_DIR, 'automor_seen.json');
const TEMP_DIR   = path.join(DATA_DIR, 'automor_temp');
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(TEMP_DIR);

// ── State helpers ─────────────────────────────────────────────────────────────
function loadState()      { try { return fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}; } catch { return {}; } }
function saveState(d)     { try { fs.writeFileSync(STATE_FILE, JSON.stringify(d, null, 2)); } catch {} }
function loadSeen()       { try { return fs.existsSync(SEEN_FILE)  ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))  : []; } catch { return []; } }
function saveSeen(arr)    { try { fs.writeFileSync(SEEN_FILE, JSON.stringify(arr)); } catch {} }

let threadStates = loadState();   // { [threadID]: { enabled, count, lastPostedAt } }
let seenNews     = new Set(loadSeen()); // set of URL/id strings already posted

function getTs(tid)       { return threadStates[String(tid)] || {}; }
function setTs(tid, patch){ threadStates[String(tid)] = { ...getTs(tid), ...patch }; saveState(threadStates); }

function markSeen(id) {
  seenNews.add(String(id));
  if (seenNews.size > 800) {
    // Keep only latest 500 — rotate
    const arr = [...seenNews];
    seenNews = new Set(arr.slice(arr.length - 500));
  }
  saveSeen([...seenNews]);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
async function get(url, opts = {}) {
  return axios.get(url, { timeout: 10000, headers: { 'User-Agent': UA, ...opts.headers }, ...opts });
}

// ── RSS parser (no extra lib needed) ─────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  const blocks = xml.split('<item');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (tag) => {
      const cdata = block.match(new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
      if (cdata) return cdata[1].trim();
      const plain = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return plain ? plain[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const title   = get('title');
    const link    = get('link') || block.match(/<link[^>]*>([^<]+)/)?.[1]?.trim() || '';
    const desc    = get('description') || get('summary') || '';
    const pubDate = get('pubDate') || get('dc:date') || '';
    const thumb   = block.match(/url="([^"]+\.(jpg|jpeg|png|webp))"/i)?.[1] ||
                    block.match(/<media:thumbnail[^>]+url="([^"]+)"/i)?.[1] ||
                    block.match(/<enclosure[^>]+url="([^"]{10,})"/i)?.[1] ||
                    desc.match(/src="([^"]+\.(jpg|jpeg|png|webp))"/i)?.[1] || '';
    if (title && title.length > 3) items.push({ title, link, desc: desc.replace(/<[^>]+>/g, '').slice(0, 200), pubDate, thumb });
  }
  return items;
}

// ── NEWS SOURCES ─────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  { name: 'PhilStar',         label: '📰 PhilStar',         emoji: '🇵🇭', url: 'https://www.philstar.com/rss/headlines',  cat: 'Breaking' },
  { name: 'PhilStar Nation',  label: '🏛️ PhilStar Nation',  emoji: '🏛️', url: 'https://www.philstar.com/rss/nation',      cat: 'Nation' },
  { name: 'PhilStar Sports',  label: '⚽ PhilStar Sports',  emoji: '⚽', url: 'https://www.philstar.com/rss/sports',      cat: 'Sports' },
  { name: 'PhilStar Business',label: '💼 PhilStar Business', emoji: '💼', url: 'https://www.philstar.com/rss/business',    cat: 'Business' },
  { name: 'Rappler',          label: '📡 Rappler',           emoji: '📡', url: 'https://www.rappler.com/rss/',             cat: 'News' },
];

// Fetch all RSS + return array of news items
async function fetchAllRSS() {
  const results = [];
  await Promise.all(RSS_FEEDS.map(async (feed) => {
    try {
      const { data } = await get(feed.url);
      const items = parseRSS(data);
      for (const item of items) {
        if (!item.link) continue;
        results.push({ ...item, source: feed.label, emoji: feed.emoji, cat: feed.cat });
      }
    } catch (e) {
      // Silently skip broken feeds
    }
  }));
  return results;
}

// Fetch PH earthquakes from USGS (free, no key)
async function fetchEarthquakes() {
  try {
    const { data } = await get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const PH_REGEX = /Philippines|Mindanao|Luzon|Visayas|Davao|Cebu|Manila|Leyte|Samar|Palawan|Batangas|Bicol|Iloilo|Zamboanga|Cotabato/i;
    return (parsed.features || [])
      .filter(e => PH_REGEX.test(e.properties.place || ''))
      .map(e => ({
        title:  `M${e.properties.mag} Earthquake — ${e.properties.place}`,
        link:   e.properties.url || 'https://earthquake.usgs.gov',
        desc:   `Magnitude ${e.properties.mag} earthquake recorded ${e.properties.place}. ` +
                `Depth: ${Math.round((e.geometry?.coordinates?.[2] || 0))} km.`,
        pubDate: new Date(e.properties.time).toISOString(),
        thumb:  '',
        source: '🌍 USGS',
        emoji:  '🌋',
        cat:    'Earthquake',
        id:     e.id,
      }));
  } catch { return []; }
}

// Pick one unseen news item
async function getNextNews() {
  const [rss, quakes] = await Promise.all([fetchAllRSS(), fetchEarthquakes()]);
  const all = [...quakes, ...rss]; // Earthquakes first (priority)

  // Filter out already-seen items
  const fresh = all.filter(n => {
    const id = n.id || n.link;
    return id && !seenNews.has(String(id));
  });

  if (!fresh.length) {
    // All seen — clear cache and try again
    seenNews.clear();
    saveSeen([]);
    return all[0] || null;
  }

  return fresh[0]; // Return freshest unseen item
}

// ── VIDEO via yt-dlp ─────────────────────────────────────────────────────────
const VIDEO_QUERIES = [
  'GMA News Philippines today',
  'ABS-CBN News Philippines latest',
  'CNN Philippines news today',
  'GMA Integrated News breaking Philippines',
  'UNTV News Philippines today',
];
let videoQueryIdx = 0;

function runCmd(cmd, opts = {}) {
  return new Promise((res, rej) =>
    exec(cmd, { maxBuffer: 1024 * 1024 * 300, timeout: 120000, ...opts }, (e, out, se) =>
      e ? rej(new Error(se?.slice(0, 300) || e.message)) : res(out.trim())
    )
  );
}

async function downloadNewsVideo(headline) {
  const query = `${headline || VIDEO_QUERIES[videoQueryIdx++ % VIDEO_QUERIES.length]} site:youtube.com`;
  const searchQ = `ytsearch1:${headline ? headline + ' Philippines news' : VIDEO_QUERIES[videoQueryIdx++ % VIDEO_QUERIES.length]}`;
  const outPath = path.join(TEMP_DIR, `news_${Date.now()}.mp4`);

  try {
    // Get video info first (fast, no download)
    const infoCmd = `yt-dlp "${searchQ}" --get-id --get-title --no-playlist --match-filter "duration <= 600" 2>&1`;
    const info = await runCmd(infoCmd);
    const lines = info.split('\n').filter(l => l.trim() && !l.startsWith('WARNING') && !l.startsWith('['));
    if (!lines.length) throw new Error('No video found');

    const title   = lines[0] || 'Philippines News';
    const videoId = lines[1] || lines[0];
    if (!videoId || videoId.length < 5) throw new Error('No valid video ID');

    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Download best quality under 50MB, max 5 min
    await runCmd(
      `yt-dlp "${ytUrl}" -f "best[height<=480][ext=mp4]/best[height<=480]/bestvideo[height<=480]+bestaudio/best" ` +
      `--max-filesize 50m --no-playlist -o "${outPath}" 2>&1`
    );

    if (!fs.existsSync(outPath)) throw new Error('Download failed');
    const stat = fs.statSync(outPath);
    if (stat.size < 50000) throw new Error('File too small');

    return { path: outPath, title, ytUrl };
  } catch (e) {
    console.error('[AutoMOR Video]', e.message?.slice(0, 100));
    try { fs.removeSync(outPath); } catch {}
    return null;
  }
}

// ── Format message ────────────────────────────────────────────────────────────
function formatNewsMsg(news, isVideo = false) {
  const now  = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
  const cat  = news.cat || 'News';
  const catEmoji = {
    'Breaking': '🚨', 'Nation': '🏛️', 'Sports': '⚽', 'Business': '💼',
    'News': '📰', 'Earthquake': '🌋',
  }[cat] || '📰';

  const lines = [
    `${catEmoji} ${bold('PHILIPPINE NEWS UPDATE')}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `${news.emoji || '📰'} ${bold('[' + cat.toUpperCase() + ']')} ${bold(news.title)}`,
    '',
  ];

  if (news.desc && news.desc.length > 10) {
    lines.push(news.desc.slice(0, 300));
    lines.push('');
  }

  lines.push(`📅 ${bold('Updated:')} ${now} PH`);
  lines.push(`📌 ${bold('Source:')} ${news.source}`);
  if (news.link) lines.push(`🔗 ${news.link}`);
  lines.push('');
  if (isVideo) lines.push(`🎬 ${bold('VIDEO NEWS KASAMA!')}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🏷️ ${bold(TEAM)} | AutoMOR News 🇵🇭`);

  return lines.join('\n').slice(0, 2000);
}

// ── Per-thread cycle counter for video (every 4th = video post) ──────────────
const cycleCounts = new Map(); // threadID → cycle count

// ── MAIN POST CYCLE ───────────────────────────────────────────────────────────
async function runCycle(api, threadID) {
  const ts = getTs(threadID);
  if (!ts.enabled) return;

  const cycle = (cycleCounts.get(String(threadID)) || 0) + 1;
  cycleCounts.set(String(threadID), cycle);

  try {
    // 1. Get fresh news
    const news = await getNextNews();
    if (!news) {
      console.log(`[AutoMOR] No news found for thread ${threadID}`);
      scheduleNext(api, threadID);
      return;
    }

    // Mark as seen
    const newsId = news.id || news.link;
    markSeen(newsId);

    // 2. Every 4th cycle → try video post
    const doVideo = (cycle % 4 === 0);

    if (doVideo) {
      const msg = formatNewsMsg(news, true);
      console.log(`[AutoMOR] 🎬 Downloading video for thread ${threadID}...`);

      // Send text first (fast), then attach video
      await new Promise((res, rej) => api.sendMessage(msg, String(threadID), e => e ? rej(e) : res()));

      const video = await downloadNewsVideo(news.title);
      if (video) {
        const vidMsg = `🎬 ${bold('VIDEO NEWS:')} ${bold(news.title)}\n📅 ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n🏷️ ${bold(TEAM)}`;
        await new Promise((res, rej) => {
          api.sendMessage({ body: vidMsg, attachment: fs.createReadStream(video.path) }, String(threadID), e => e ? rej(e) : res());
        });
        // Cleanup video after 10 min
        setTimeout(() => { try { fs.removeSync(video.path); } catch {} }, 600000);
        console.log(`[AutoMOR] 🎬 Video sent to thread ${threadID}: ${video.title?.slice(0, 60)}`);
      }
    } else {
      // 3. Text-only post (may include thumbnail image)
      const msg = formatNewsMsg(news);

      if (news.thumb && news.thumb.startsWith('http')) {
        // Try to attach thumbnail
        try {
          const imgPath = path.join(TEMP_DIR, `thumb_${Date.now()}.jpg`);
          const imgRes  = await axios.get(news.thumb, { responseType: 'arraybuffer', timeout: 8000, headers: { 'User-Agent': UA } });
          fs.writeFileSync(imgPath, imgRes.data);

          await new Promise((res, rej) => {
            api.sendMessage({ body: msg, attachment: fs.createReadStream(imgPath) }, String(threadID), e => e ? rej(e) : res());
          });
          setTimeout(() => { try { fs.removeSync(imgPath); } catch {} }, 60000);
        } catch {
          // Thumbnail failed — send text only
          await new Promise((res, rej) => api.sendMessage(msg, String(threadID), e => e ? rej(e) : res()));
        }
      } else {
        await new Promise((res, rej) => api.sendMessage(msg, String(threadID), e => e ? rej(e) : res()));
      }
    }

    const count = (ts.count || 0) + 1;
    setTs(threadID, { count, lastPostedAt: new Date().toISOString() });
    console.log(`[AutoMOR #${count}] ✅ Posted to thread ${threadID}: ${news.title?.slice(0, 60)}`);

  } catch (e) {
    console.error(`[AutoMOR] ❌ Error thread ${threadID}:`, e.message?.slice(0, 120));
  }

  scheduleNext(api, threadID);
}

// ── SCHEDULER ─────────────────────────────────────────────────────────────────
const timers = new Map();

function scheduleNext(api, threadID) {
  const existing = timers.get(String(threadID));
  if (existing) clearTimeout(existing);
  if (!getTs(threadID).enabled) return;

  // 4 minutes ± 20 seconds jitter (anti-detect)
  const jitter = (Math.random() - 0.5) * 40000;
  const delay  = INTERVAL + jitter;
  const timer  = setTimeout(() => runCycle(api, threadID), delay);
  timers.set(String(threadID), timer);
}

function startAutoMor(api, threadID) {
  setTs(threadID, { enabled: true });
  cycleCounts.set(String(threadID), 0);
  // First post within 30 seconds
  const t = setTimeout(() => runCycle(api, threadID), 30000 + Math.random() * 30000);
  timers.set(String(threadID), t);
}

function stopAutoMor(threadID) {
  const t = timers.get(String(threadID));
  if (t) clearTimeout(t);
  timers.delete(String(threadID));
  setTs(threadID, { enabled: false });
}

// ── MODULE EXPORTS ────────────────────────────────────────────────────────────
module.exports.config = {
  name:            'automor',
  version:         VERSION,
  hasPermssion:    2,
  credits:         TEAM,
  description:     'Auto-posts live Philippines news (breaking, lindol, sports, politics) every 4 minutes, 24/7',
  commandCategory: 'Admin',
  usages:          '[on | off | status]',
  cooldowns:       5
};

module.exports.onLoad = function ({ api }) {
  const saved = loadState();
  let restored = 0;
  for (const [tid, ts] of Object.entries(saved)) {
    if (ts.enabled) {
      setTs(tid, { enabled: true });
      setTimeout(() => startAutoMor(api, tid), restored * 15000 + 10000);
      restored++;
    }
  }
  if (restored) console.log(`[AutoMOR] 🔄 Restored ${restored} thread(s) from saved state`);
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P   = global.config?.PREFIX || '!';
  const sub = (args[0] || '').toLowerCase();
  const ts  = getTs(threadID);

  if (!sub || sub === 'help') {
    const active = Object.values(threadStates).filter(s => s.enabled).length;
    return api.sendMessage(
      `╔═══════════════════════════════╗\n` +
      `║  📰 ${bold('AUTOMOR NEWS v' + VERSION)}       ║\n` +
      `║  🏷️  ${bold(TEAM)}   ║\n` +
      `╚═══════════════════════════════╝\n\n` +
      `🇵🇭 ${bold('LIVE PHILIPPINE NEWS — 24/7 NON-STOP!')}\n` +
      `⏱️ ${bold('Every 4 minutes — walang tigil!')}\n\n` +
      `📡 ${bold('SOURCES (FREE, WALANG API KEY):')}\n` +
      `  📰 PhilStar — Headlines, Nation, Sports, Business\n` +
      `  📡 Rappler — Latest PH News\n` +
      `  🌋 USGS — Real-time PH Earthquakes\n` +
      `  🎬 YouTube — Video News (bawat 4th post)\n\n` +
      `📋 ${bold('COMMANDS:')}\n${'─'.repeat(32)}\n` +
      `${P}automor on      — I-start dito\n` +
      `${P}automor off     — I-stop dito\n` +
      `${P}automor status  — Check status\n\n` +
      `📊 ${bold('STATUS:')}\n` +
      `  • ${bold('Active GCs:')} ${active}\n` +
      `  • ${bold('Dito:')} ${ts.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      (ts.count ? `  • ${bold('Total posts dito:')} ${ts.count}\n` : '') +
      (ts.lastPostedAt ? `  • ${bold('Last post:')} ${new Date(ts.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` : '') +
      `\n🔒 ${bold('Admin only')} | 🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  if (sub === 'on') {
    if (ts.enabled) {
      return api.sendMessage(
        `⚠️ ${bold('Naka-ON na ang AutoMOR News dito.')}\nI-stop: ${P}automor off`,
        threadID, messageID
      );
    }
    startAutoMor(api, threadID);
    return api.sendMessage(
      `✅ ${bold('AUTOMOR NEWS — STARTED! 🇵🇭')}\n\n` +
      `📰 ${bold('Live Philippines News — walang tigil!')}\n` +
      `⏱️ ${bold('Every 4 minutes, 24/7')}\n\n` +
      `📡 ${bold('SOURCES:')}\n` +
      `  • PhilStar (Headlines, Nation, Sports, Business)\n` +
      `  • Rappler PH News\n` +
      `  • USGS Real-time Earthquakes\n` +
      `  • 🎬 YouTube Video News (every 4th post)\n\n` +
      `📌 ${bold('Hindi paulit-ulit!')} Bagong balita bawat 4 minuto.\n` +
      `🕒 ${bold('First post: in 30-60 seconds...')}\n\n` +
      `💡 I-stop: ${P}automor off\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  if (sub === 'off') {
    if (!ts.enabled) {
      return api.sendMessage(
        `⚠️ ${bold('Hindi naman naka-ON ang AutoMOR dito.')}\nI-start: ${P}automor on`,
        threadID, messageID
      );
    }
    stopAutoMor(threadID);
    return api.sendMessage(
      `🛑 ${bold('AUTOMOR NEWS — STOPPED!')}\n\n` +
      `Hindi na mag-po-post ng news dito.\n` +
      `📊 Total na-post dito: ${bold(String(ts.count || 0))}\n` +
      `💡 I-on ulit: ${P}automor on`,
      threadID, messageID
    );
  }

  if (sub === 'status') {
    const active = Object.entries(threadStates).filter(([, s]) => s.enabled);
    return api.sendMessage(
      `📊 ${bold('AUTOMOR NEWS STATUS')} 🇵🇭\n${'─'.repeat(32)}\n` +
      `${bold('Active GCs:')} ${active.length}\n\n` +
      (active.length
        ? active.map(([id, s], i) =>
            `${i + 1}. Thread ${id}\n   Posts: ${s.count || 0} | Last: ${s.lastPostedAt ? new Date(s.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}`
          ).join('\n')
        : 'Walang active.') +
      `\n\n📰 ${bold('News seen cache:')} ${seenNews.size} items\n` +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  return api.sendMessage(
    `❓ Unknown command: ${P}automor [on|off|status]`,
    threadID, messageID
  );
};
