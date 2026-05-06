/**
 * !automor — Auto-posts live Philippines news to Facebook TIMELINE/WALL
 * Every 4 minutes · 24/7 walang tigil · FREE, no API key
 * Sources: PhilStar, Rappler, USGS Earthquakes + yt-dlp video (every 4th post)
 * Uses api.createPost() — posts to bot's own Facebook wall, NOT group chat
 */

const fs       = require('fs-extra');
const path     = require('path');
const axios    = require('axios');
const { exec } = require('child_process');
const bold     = require('../../utils/bold');

const VERSION        = '3.0.0';
const TEAM           = 'TEAM STARTCOPE BETA';
const NEWS_INTERVAL  = 10 * 60 * 1000; // 10 minutes — text/image news
const VIDEO_INTERVAL =  4 * 60 * 1000; // 4 minutes  — video news

// ── Paths ─────────────────────────────────────────────────────────────────────
const DATA_DIR   = path.join(process.cwd(), 'utils/data');
const STATE_FILE = path.join(DATA_DIR, 'automor_state.json');
const SEEN_FILE  = path.join(DATA_DIR, 'automor_seen.json');
const TEMP_DIR   = path.join(DATA_DIR, 'automor_temp');
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(TEMP_DIR);

// ── State helpers ─────────────────────────────────────────────────────────────
function loadStateFile()   { try { return fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}; } catch { return {}; } }
function saveStateFile(d)  { try { fs.writeFileSync(STATE_FILE, JSON.stringify(d, null, 2)); } catch {} }
function loadSeen()        { try { return fs.existsSync(SEEN_FILE)  ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))  : []; } catch { return []; } }
function saveSeen(arr)     { try { fs.writeFileSync(SEEN_FILE, JSON.stringify(arr)); } catch {} }

// Global state — posts to Facebook WALL (not per-thread)
let state = {
  enabled:      false,
  count:        0,
  lastPostedAt: null,
};

function loadPersistedState() {
  const s = loadStateFile();
  if (s.enabled      !== undefined) state.enabled      = s.enabled;
  if (s.count        !== undefined) state.count        = s.count;
  if (s.lastPostedAt !== undefined) state.lastPostedAt = s.lastPostedAt;
}
function persist() { saveStateFile(state); }

let seenNews = new Set(loadSeen());
function markSeen(id) {
  seenNews.add(String(id));
  if (seenNews.size > 800) {
    const arr = [...seenNews];
    seenNews = new Set(arr.slice(arr.length - 500));
  }
  saveSeen([...seenNews]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pick  = (a) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const UA    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

async function httpGet(url) {
  return axios.get(url, { timeout: 10000, headers: { 'User-Agent': UA } });
}

// ── RSS parser ────────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items  = [];
  const blocks = xml.split('<item');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get   = (tag) => {
      const cdata = block.match(new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
      if (cdata) return cdata[1].trim();
      const plain = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return plain ? plain[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const title   = get('title');
    const link    = get('link') || block.match(/<link[^>]*>([^<]+)/)?.[1]?.trim() || '';
    const desc    = get('description') || get('summary') || '';
    const pubDate = get('pubDate') || '';
    const thumb   = block.match(/url="([^"]+\.(jpg|jpeg|png|webp))"/i)?.[1] ||
                    block.match(/<media:thumbnail[^>]+url="([^"]+)"/i)?.[1] || '';
    if (title && title.length > 3) {
      items.push({
        title,
        link,
        desc:    desc.replace(/<[^>]+>/g, '').trim().slice(0, 250),
        pubDate,
        thumb,
      });
    }
  }
  return items;
}

// ── News sources (FREE, no API key) ──────────────────────────────────────────
const RSS_FEEDS = [
  { name: 'PhilStar',          emoji: '🚨', cat: 'Breaking',  url: 'https://www.philstar.com/rss/headlines' },
  { name: 'PhilStar Nation',   emoji: '🏛️', cat: 'Nation',    url: 'https://www.philstar.com/rss/nation' },
  { name: 'PhilStar Sports',   emoji: '⚽', cat: 'Sports',    url: 'https://www.philstar.com/rss/sports' },
  { name: 'PhilStar Business', emoji: '💼', cat: 'Business',  url: 'https://www.philstar.com/rss/business' },
  { name: 'Rappler',           emoji: '📡', cat: 'News',      url: 'https://www.rappler.com/rss/' },
];

async function fetchAllRSS() {
  const out = [];
  await Promise.all(RSS_FEEDS.map(async (f) => {
    try {
      const { data } = await httpGet(f.url);
      for (const item of parseRSS(data)) {
        if (item.link) out.push({ ...item, source: f.name, emoji: f.emoji, cat: f.cat });
      }
    } catch {}
  }));
  return out;
}

async function fetchEarthquakes() {
  try {
    const { data } = await httpGet('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
    const parsed   = typeof data === 'string' ? JSON.parse(data) : data;
    const PH       = /Philippines|Mindanao|Luzon|Visayas|Davao|Cebu|Manila|Leyte|Samar|Palawan|Batangas|Bicol|Iloilo|Zamboanga|Cotabato/i;
    return (parsed.features || [])
      .filter(e => PH.test(e.properties.place || ''))
      .map(e => ({
        title:  `M${e.properties.mag} Earthquake — ${e.properties.place}`,
        link:   e.properties.url || 'https://earthquake.usgs.gov',
        desc:   `Magnitude ${e.properties.mag} earthquake recorded. Place: ${e.properties.place}. Depth: ${Math.round(e.geometry?.coordinates?.[2] || 0)} km.`,
        pubDate: new Date(e.properties.time).toISOString(),
        thumb:  '',
        source: 'USGS',
        emoji:  '🌋',
        cat:    'Earthquake',
        id:     e.id,
      }));
  } catch { return []; }
}

async function getNextNews() {
  const [rss, quakes] = await Promise.all([fetchAllRSS(), fetchEarthquakes()]);
  const all   = [...quakes, ...rss]; // Quakes first (priority)
  const fresh = all.filter(n => {
    const id = n.id || n.link;
    return id && !seenNews.has(String(id));
  });
  if (!fresh.length) {
    // All seen — clear old cache and restart
    seenNews.clear();
    saveSeen([]);
    return all[0] || null;
  }
  return fresh[0];
}

// ── Post composer ─────────────────────────────────────────────────────────────
const DIVIDERS = [
  '━━━━━━━━━━━━━━━━━━━━━━━━',
  '═══════════════════════',
  '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  '•───────────────────•',
  '◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆',
];

function composeNewsPost(news, isVideo = false) {
  const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
  const div = pick(DIVIDERS);

  const layouts = [
    () =>
      `${news.emoji} ${bold('[' + news.cat.toUpperCase() + '] ' + news.source)} 🇵🇭\n${div}\n\n` +
      `${bold(news.title)}\n\n` +
      (news.desc ? `${news.desc}\n\n` : '') +
      `📅 ${now} PH\n` +
      (news.link ? `🔗 ${news.link}\n` : '') +
      (isVideo ? `\n🎬 ${bold('May kasamang VIDEO NEWS!')}\n` : '') +
      `${div}\n🏷️ ${bold(TEAM)} | MOR Naga News 🇵🇭`,

    () =>
      `╔══ 📡 ${bold('PHILIPPINE NEWS')} ══╗\n\n` +
      `${news.emoji} ${bold(news.cat.toUpperCase())} — ${bold(news.source)}\n\n` +
      `${bold(news.title)}\n\n` +
      (news.desc ? `${news.desc}\n\n` : '') +
      `📅 ${now} PH\n` +
      (news.link ? `🌐 ${news.link}\n` : '') +
      `\n╚═════════════════════════╝\n` +
      `🏷️ ${bold(TEAM)} #PhilippinesNews`,

    () =>
      `🔴 ${bold('LIVE NEWS UPDATE')} — ${bold('PHILIPPINES')}\n${div}\n\n` +
      `${news.emoji} ${bold(news.title)}\n\n` +
      (news.desc ? `${news.desc}\n\n` : '') +
      `📌 ${bold('Source:')} ${news.source}\n` +
      `📅 ${bold('Time:')} ${now} PH\n` +
      (news.link ? `🔗 ${news.link}\n` : '') +
      `${div}\n🇵🇭 ${bold(TEAM)}`,
  ];

  return pick(layouts)().trim().slice(0, 1900);
}

// ── createPost wrapper ────────────────────────────────────────────────────────
function doCreatePost(api, body, attachment) {
  return new Promise((res, rej) => {
    if (typeof api.createPost !== 'function') {
      return rej(new Error('api.createPost not available'));
    }
    const msg = attachment ? { body, attachment } : { body };
    api.createPost(msg, (err, url) => err ? rej(err) : res(url));
  });
}

// ── Video download via yt-dlp ─────────────────────────────────────────────────
const VIDEO_QUERIES = [
  'GMA News today Philippines',
  'ABS-CBN News Philippines latest',
  'CNN Philippines news today',
  'UNTV News Philippines today',
  'GMA Integrated News breaking Philippines',
];
let vidQueryIdx = 0;

function runCmd(cmd) {
  return new Promise((res, rej) =>
    exec(cmd, { maxBuffer: 1024 * 1024 * 300, timeout: 90000 }, (e, out, se) =>
      e ? rej(new Error(se?.slice(0, 200) || e.message)) : res(out.trim())
    )
  );
}

async function downloadNewsVideo(headline) {
  const q       = headline ? `${headline} Philippines news` : VIDEO_QUERIES[vidQueryIdx++ % VIDEO_QUERIES.length];
  const outPath = path.join(TEMP_DIR, `vid_${Date.now()}.mp4`);
  try {
    const info  = await runCmd(`yt-dlp "ytsearch1:${q.replace(/"/g, '')}" --get-id --get-title --no-playlist 2>&1`);
    const lines = info.split('\n').filter(l => l.trim() && !l.startsWith('WARNING'));
    if (!lines.length) throw new Error('No video found');
    const title = lines[0];
    const vidId = lines[1] || lines[0];
    if (!vidId || vidId.length < 5) throw new Error('Invalid video ID');

    await runCmd(
      `yt-dlp "https://www.youtube.com/watch?v=${vidId}" ` +
      `-f "best[height<=480][ext=mp4]/best[height<=480]/best" ` +
      `--max-filesize 40m --no-playlist -o "${outPath}" 2>&1`
    );
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 50000) throw new Error('Download failed');
    return { path: outPath, title };
  } catch (e) {
    console.error('[AutoMOR Video]', e.message?.slice(0, 80));
    try { fs.removeSync(outPath); } catch {}
    return null;
  }
}

// ── Shared state ──────────────────────────────────────────────────────────────
let newsTimer  = null;
let videoTimer = null;
let globalApi  = null;

// ── Shared helpers ─────────────────────────────────────────────────────────────
function saveAppstate(api) {
  try {
    const appState = api.getAppState();
    if (appState && Array.isArray(appState)) {
      fs.writeFileSync('./appstate.json', JSON.stringify(appState, null, 2));
      fs.writeFileSync('./utils/data/fbstate.json', JSON.stringify(appState, null, 2));
    }
  } catch {}
}

function handlePostError(e, timerRef, cycleFn) {
  const msg = (e.message || '').toLowerCase();
  if (msg.includes('checkpoint') || msg.includes('restricted') || msg.includes('suspended') || msg.includes('disabled')) {
    console.error(`[AutoMOR] 🔒 RESTRICTION DETECTED — backing off 30 min:`, msg.slice(0, 80));
    if (global.protection?.clearCheckpoint) global.protection.clearCheckpoint(globalApi);
    return setTimeout(cycleFn, 30 * 60 * 1000 + Math.random() * 5 * 60 * 1000);
  }
  console.error(`[AutoMOR] ❌ error:`, (e.message || 'unknown').slice(0, 120));
  state.errorCount = (state.errorCount || 0) + 1;
  const backoff = Math.min(state.errorCount * 3 * 60 * 1000, 20 * 60 * 1000);
  console.log(`[AutoMOR] ⏳ backoff: ${Math.round(backoff / 60000)} min`);
  return setTimeout(cycleFn, backoff);
}

// ── NEWS CYCLE — every 10 minutes ─────────────────────────────────────────────
async function runNewsCycle() {
  if (!state.enabled || !globalApi) return;
  try {
    const news = await getNextNews();
    if (!news) {
      console.log('[AutoMOR:News] No fresh news — skipping');
    } else {
      const newsId = news.id || news.link;
      markSeen(newsId);
      const text = composeNewsPost(news);

      if (news.thumb && news.thumb.startsWith('http')) {
        try {
          const imgPath = path.join(TEMP_DIR, `thumb_${Date.now()}.jpg`);
          const imgRes  = await axios.get(news.thumb, { responseType: 'arraybuffer', timeout: 8000, headers: { 'User-Agent': UA } });
          fs.writeFileSync(imgPath, imgRes.data);
          await doCreatePost(globalApi, text, fs.createReadStream(imgPath));
          setTimeout(() => { try { fs.removeSync(imgPath); } catch {} }, 60000);
        } catch {
          await doCreatePost(globalApi, text);
        }
      } else {
        await doCreatePost(globalApi, text);
      }

      state.count++;
      state.lastPostedAt = new Date().toISOString();
      persist();
      saveAppstate(globalApi);
      if (global.protection?.clearCheckpoint) global.protection.clearCheckpoint(globalApi);
      console.log(`[AutoMOR:News #${state.count}] ✅ ${news.title?.slice(0, 60)}`);
    }

    state.errorCount = 0;
  } catch (e) {
    newsTimer = handlePostError(e, newsTimer, runNewsCycle);
    return;
  }

  // Schedule next news post — 10 min ± 60–90 sec jitter
  const jitter = (Math.random() - 0.5) * 2 * (60000 + Math.random() * 30000);
  newsTimer = setTimeout(runNewsCycle, NEWS_INTERVAL + jitter);
}

// ── VIDEO CYCLE — every 4 minutes ─────────────────────────────────────────────
async function runVideoCycle() {
  if (!state.enabled || !globalApi) return;
  try {
    const news = await getNextNews();
    if (!news) {
      console.log('[AutoMOR:Video] No fresh news for video — skipping');
    } else {
      const newsId = `video_${news.id || news.link}`;
      markSeen(newsId);

      // Post text teaser first (instant)
      const teaser = composeNewsPost(news, true);
      await doCreatePost(globalApi, teaser);
      console.log(`[AutoMOR:Video] 📰 Teaser posted — downloading video...`);

      // Then download and post video
      const video = await downloadNewsVideo(news.title);
      if (video) {
        const vidBody =
          `🎬 ${bold('VIDEO NEWS:')} ${bold(news.title)}\n` +
          `📅 ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` +
          `🏷️ ${bold(TEAM)} 🇵🇭`;
        await doCreatePost(globalApi, vidBody, fs.createReadStream(video.path));
        // Keep video file alive for 5 min then clean up
        setTimeout(() => { try { fs.removeSync(video.path); } catch {} }, 300000);
        console.log(`[AutoMOR:Video] 🎬 Video posted: ${video.title?.slice(0, 60)}`);
      } else {
        console.log('[AutoMOR:Video] ⚠️ No video found — text teaser only');
      }

      saveAppstate(globalApi);
      if (global.protection?.clearCheckpoint) global.protection.clearCheckpoint(globalApi);
    }

    state.errorCount = 0;
  } catch (e) {
    videoTimer = handlePostError(e, videoTimer, runVideoCycle);
    return;
  }

  // Schedule next video — 4 min ± 30–60 sec jitter
  const jitter = (Math.random() - 0.5) * 2 * (30000 + Math.random() * 30000);
  videoTimer = setTimeout(runVideoCycle, VIDEO_INTERVAL + jitter);
}

function startAutoMor(api) {
  globalApi     = api;
  state.enabled = true;
  persist();

  // Stagger starts: news first (30–45 sec), video after (90–120 sec)
  const newsDelay  = 30000 + Math.random() * 15000;
  const videoDelay = 90000 + Math.random() * 30000;
  newsTimer  = setTimeout(runNewsCycle,  newsDelay);
  videoTimer = setTimeout(runVideoCycle, videoDelay);

  console.log(`[AutoMOR] ✅ Started — 📰 news every 10min | 🎬 video every 4min`);
  console.log(`[AutoMOR] ⏱️ First news in ${Math.round(newsDelay / 1000)}s, first video in ${Math.round(videoDelay / 1000)}s`);
}

function stopAutoMor() {
  if (newsTimer)  { clearTimeout(newsTimer);  newsTimer  = null; }
  if (videoTimer) { clearTimeout(videoTimer); videoTimer = null; }
  state.enabled = false;
  persist();
  console.log(`[AutoMOR] 🛑 Stopped (news + video timers cleared)`);
}

// ── Command exports ───────────────────────────────────────────────────────────
module.exports.config = {
  name:            'automor',
  version:         VERSION,
  hasPermssion:    2,
  credits:         TEAM,
  description:     'Auto-posts PH news (text every 10min + video every 4min) to Facebook WALL 24/7',
  commandCategory: 'Admin',
  usages:          '[on | off | status]',
  cooldowns:       5
};

module.exports.onLoad = function ({ api }) {
  loadPersistedState();
  if (state.enabled) {
    globalApi = api;
    console.log(`[AutoMOR] 🔄 Restored — resuming dual-cycle (news 10min + video 4min)...`);
    setTimeout(() => startAutoMor(api), 10000);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P   = global.config?.PREFIX || '!';
  const sub = (args[0] || '').toLowerCase();

  if (!sub || sub === 'help') {
    return api.sendMessage(
      `╔═══════════════════════════════╗\n` +
      `║  📰 ${bold('AUTOMOR NEWS v' + VERSION)}      ║\n` +
      `║  🏷️  ${bold(TEAM)}   ║\n` +
      `╚═══════════════════════════════╝\n\n` +
      `🇵🇭 ${bold('LIVE PHILIPPINE NEWS — 24/7 NON-STOP!')}\n` +
      `🖼️ ${bold('Posts to: Facebook WALL/TIMELINE')}\n` +
      `📰 ${bold('News cycle:')} Every 10 minutes (text + thumbnail)\n` +
      `🎬 ${bold('Video cycle:')} Every 4 minutes (teaser + video)\n\n` +
      `📡 ${bold('SOURCES (FREE, no API key):')}\n` +
      `  📰 PhilStar — Headlines, Nation, Sports, Business\n` +
      `  📡 Rappler — PH News\n` +
      `  🌋 USGS — Real-time PH Earthquakes\n` +
      `  🎬 yt-dlp — Live video news\n\n` +
      `📋 ${bold('COMMANDS:')}\n${'─'.repeat(32)}\n` +
      `${P}automor on      — I-start\n` +
      `${P}automor off     — I-stop\n` +
      `${P}automor status  — Check status\n\n` +
      `📊 ${bold('STATUS:')}\n` +
      `  • ${bold('State:')} ${state.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `  • ${bold('Total posts:')} ${state.count}\n` +
      (state.lastPostedAt ? `  • ${bold('Last post:')} ${new Date(state.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` : '') +
      `\n🔒 ${bold('Admin only')} | Posts to Facebook WALL`,
      threadID, messageID
    );
  }

  if (sub === 'on') {
    if (state.enabled) {
      return api.sendMessage(`⚠️ ${bold('Naka-ON na ang AutoMOR News.')}\nI-stop: ${P}automor off`, threadID, messageID);
    }
    startAutoMor(api);
    return api.sendMessage(
      `✅ ${bold('AUTOMOR NEWS — STARTED! 🇵🇭')}\n\n` +
      `📰 ${bold('Live Philippines News — DUAL CYCLE!')}\n` +
      `🖼️ ${bold('Posts to: Facebook WALL/TIMELINE')}\n\n` +
      `📰 ${bold('News Cycle:')} Every 10 min — text + thumbnail\n` +
      `🎬 ${bold('Video Cycle:')} Every 4 min — teaser + video\n\n` +
      `📡 ${bold('Sources:')}\n` +
      `  • PhilStar (Headlines, Nation, Sports, Business)\n` +
      `  • Rappler PH News\n` +
      `  • USGS Real-time Earthquakes 🌋\n` +
      `  • yt-dlp Video News 🎬\n\n` +
      `📌 ${bold('Hindi paulit-ulit!')} Nag-ta-track ng seen news.\n` +
      `🕒 ${bold('News in ~35sec | Video in ~105sec...')}\n\n` +
      `💡 I-stop: ${P}automor off\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  if (sub === 'off') {
    if (!state.enabled) {
      return api.sendMessage(`⚠️ ${bold('Hindi naman naka-ON ang AutoMOR.')}\nI-start: ${P}automor on`, threadID, messageID);
    }
    stopAutoMor();
    return api.sendMessage(
      `🛑 ${bold('AUTOMOR NEWS — STOPPED!')}\n\n` +
      `Hindi na mag-po-post ng news sa Facebook wall.\n` +
      `📊 Total posts: ${bold(String(state.count))}\n` +
      `💡 I-on ulit: ${P}automor on`,
      threadID, messageID
    );
  }

  if (sub === 'status') {
    return api.sendMessage(
      `📊 ${bold('AUTOMOR NEWS STATUS')} 🇵🇭\n${'─'.repeat(32)}\n` +
      `  • ${bold('State:')}       ${state.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `  • ${bold('Posts to:')}    Facebook Wall/Timeline\n` +
      `  • ${bold('Frequency:')}   Every 4 minutes, 24/7\n` +
      `  • ${bold('Cycle count:')} ${cycleCount}\n` +
      `  • ${bold('Total posts:')} ${state.count}\n` +
      `  • ${bold('Seen cache:')}  ${seenNews.size} articles\n` +
      `  • ${bold('Last post:')}   ${state.lastPostedAt ? new Date(state.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}\n` +
      `\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  return api.sendMessage(`❓ ${P}automor [on|off|status]`, threadID, messageID);
};
