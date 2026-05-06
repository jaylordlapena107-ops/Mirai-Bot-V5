const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const bold = require('../../utils/bold');

const VERSION = '1.0.0';
const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/radio_temp');
fs.ensureDirSync(TEMP_DIR);

const CLIP_SECONDS = 30;

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 600000);
}
function run(cmd, opts = {}) {
  return new Promise((res, rej) =>
    exec(cmd, { maxBuffer: 1024 * 1024 * 50, timeout: 45000, ...opts }, (e, _, se) =>
      e ? rej(new Error(se?.slice(0, 300) || e.message)) : res()
    )
  );
}

// ─── PHILIPPINES RADIO STATION DATABASE ────────────────────────────────────────
// Tested-working streams are marked ✅ in comment. Others included as database entries.
const STATIONS = [
  // ── MANILA / NCR ──
  { name: 'Home Radio 95.1',         freq: '95.1',  city: 'Manila',       tags: ['home radio','opm','manila'],       url: 'https://stream.radiojar.com/0tpy1h0kxtzuv' },
  { name: 'DZRH 666 AM',             freq: '666',   city: 'Manila',       tags: ['dzrh','news','talk'],               url: 'https://stream.radiojar.com/8s5u5tpdtwzuv' },
  { name: 'Wish 107.5 Manila',       freq: '107.5', city: 'Manila',       tags: ['wish','opm','love songs'],         url: 'https://stream.zeno.fm/yn65zspeuw8uv' },
  { name: 'DWRR 101.9 RT Radio',    freq: '101.9', city: 'Manila',       tags: ['rt radio','dwrr','news'],           url: 'https://stream.zeno.fm/hn6umrp6e78uv' },
  { name: 'Magic 89.9 Manila',       freq: '89.9',  city: 'Manila',       tags: ['magic','hit music','opm'],         url: 'https://live.amperwave.net/manifest/abs-magicfmaac-hlsa.m3u8' },
  { name: 'DZMM TeleRadyo 630 AM',   freq: '630',   city: 'Manila',       tags: ['dzmm','teleradyo','news','abs'],    url: 'https://live.amperwave.net/manifest/abs-dzmmamaac-hlsa.m3u8' },
  { name: 'Easy Rock 96.3 Manila',   freq: '96.3',  city: 'Manila',       tags: ['easy rock','soft','opm'],          url: 'https://stream.zeno.fm/6wpcj2ym1wquv' },
  { name: 'Love Radio 90.7 Manila',  freq: '90.7',  city: 'Manila',       tags: ['love radio','harana','romance'],   url: 'https://stream.zeno.fm/ux3s2tgqg7zuv' },
  { name: 'RX 93.1 Monster Radio',   freq: '93.1',  city: 'Manila',       tags: ['rx','monster','monster radio'],    url: 'https://stream.zeno.fm/4tv4xmcvmwzuv' },
  { name: 'Wave 89.1 Manila',        freq: '89.1',  city: 'Manila',       tags: ['wave','retro','oldies'],           url: 'https://stream.zeno.fm/tkgmvgkzc7zuv' },
  { name: 'DZBB 594 AM GMA',         freq: '594',   city: 'Manila',       tags: ['dzbb','gma','news','radyo'],       url: 'https://stream.zeno.fm/sxghqzp9x1zuv' },
  { name: 'DWIZ 882 AM',             freq: '882',   city: 'Manila',       tags: ['dwiz','talk','news'],              url: 'https://stream.zeno.fm/tfnn5y0kgjzuv' },
  { name: 'DZME 530 AM',             freq: '530',   city: 'Manila',       tags: ['dzme','talk'],                     url: 'https://stream.radiojar.com/4a0q2uk0k7zuv' },
  { name: 'DZXL 558 AM RMN Manila',  freq: '558',   city: 'Manila',       tags: ['dzxl','rmn','news'],               url: 'https://stream.radiojar.com/y0q3z3xse7zuv' },
  { name: 'Barangay LS 97.1 Manila', freq: '97.1',  city: 'Manila',       tags: ['barangay','ls','opm','harana'],    url: 'https://stream.zeno.fm/scf7y6nqk7zuv' },
  { name: 'Radyo5 92.3 Manila',      freq: '92.3',  city: 'Manila',       tags: ['radyo5','5','news'],               url: 'https://stream.zeno.fm/x6ryh48teh0uv' },
  { name: 'iFM 93.9 Manila',         freq: '93.9',  city: 'Manila',       tags: ['ifm','opm','manila'],              url: 'http://uk2.internet-radio.com:8358/live' },
  { name: 'Campus Radio 97.9',       freq: '97.9',  city: 'Manila',       tags: ['campus','youth'],                  url: 'https://stream.zeno.fm/7h2dpq7v7gzuv' },
  // ── CEBU ──
  { name: 'DXCC Cebu 105.1',         freq: '105.1', city: 'Cebu',         tags: ['cebu','dxcc'],                     url: 'https://stream.radiojar.com/bv5v5y0xc7zuv' },
  { name: 'Gold FM 90.7 Cebu',       freq: '90.7',  city: 'Cebu',         tags: ['gold fm','cebu','oldies'],         url: 'https://stream.radiojar.com/c5b4ugsgezuv' },
  { name: 'DYRF Cebu 1278 AM',       freq: '1278',  city: 'Cebu',         tags: ['dyrf','cebu','news'],              url: 'https://stream.radiojar.com/rqkufcvs6czuv' },
  // ── DAVAO ──
  { name: 'DXRR Davao 95.9',         freq: '95.9',  city: 'Davao',        tags: ['davao','dxrr'],                    url: 'https://stream.zeno.fm/6xfefkbqk7zuv' },
  { name: 'DXAB Davao',              freq: '',       city: 'Davao',        tags: ['dxab','davao','news'],             url: 'https://stream.radiojar.com/0g5p8p9kb7zuv' },
  // ── NATIONAL / GENERAL ──
  { name: 'MBC Radio 738 AM',        freq: '738',   city: 'National',     tags: ['mbc','radio','national'],          url: 'https://stream.zeno.fm/m0bvbdmmx1zuv' },
];

// ─── SEARCH ────────────────────────────────────────────────────────────────────
function searchStation(query) {
  const q = query.toLowerCase().trim();

  // Exact frequency match first
  const byFreq = STATIONS.filter(s => s.freq === q || s.freq === q.replace(/[^0-9.]/g, ''));
  if (byFreq.length) return byFreq[0];

  // Score by how many words/tags match
  let best = null, bestScore = 0;
  for (const s of STATIONS) {
    let score = 0;
    const haystack = [s.name, s.freq, s.city, ...s.tags].join(' ').toLowerCase();
    const words = q.split(/\s+/);
    for (const w of words) {
      if (w.length < 2) continue;
      if (haystack.includes(w)) score += w.length;
    }
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return bestScore >= 2 ? best : null;
}

// ─── COMMAND ───────────────────────────────────────────────────────────────────
module.exports.config = {
  name: 'radio',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Search & stream Philippine radio stations live — sends a 30-second voice clip',
  commandCategory: 'Media',
  usages: '[station name / frequency]  OR  list',
  cooldowns: 20
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';

  // Show station list
  if (!args.length || args[0]?.toLowerCase() === 'list') {
    const byCityMap = {};
    for (const s of STATIONS) {
      (byCityMap[s.city] = byCityMap[s.city] || []).push(s);
    }
    let body = `╔══════════════════════════════╗\n` +
      `║  📻 ${bold('PHILIPPINES RADIO v' + VERSION)}  ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `📡 ${bold('LIVE STREAMING — sends 30-sec voice clip!')}\n\n` +
      `📋 ${bold('PAANO GAMITIN:')}\n${'─'.repeat(30)}\n` +
      `${P}radio [station name or freq]\n` +
      `${P}radio list  — show all stations\n\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}radio Home Radio 95.1\n` +
      `• ${P}radio 95.1\n` +
      `• ${P}radio DZRH\n` +
      `• ${P}radio Wish 107.5\n` +
      `• ${P}radio Magic 89.9\n\n` +
      `📻 ${bold('AVAILABLE STATIONS:')}\n${'─'.repeat(30)}\n`;

    for (const [city, list] of Object.entries(byCityMap)) {
      body += `\n🏙️ ${bold(city)}\n`;
      body += list.map(s => `  📡 ${s.name}${s.freq ? ' (' + s.freq + ')' : ''}`).join('\n') + '\n';
    }
    body += `\n🏷️ ${bold(TEAM)}`;
    return api.sendMessage(body, threadID, messageID);
  }

  const query = args.join(' ').trim();
  const station = searchStation(query);

  if (!station) {
    return api.sendMessage(
      `❌ ${bold('Hindi nahanap ang radio station.')}\n\n` +
      `🔍 Search: "${query}"\n` +
      `💡 Subukan: ${P}radio list\n` +
      `📌 Halimbawa: ${P}radio Home Radio 95.1`,
      threadID, messageID
    );
  }

  api.setMessageReaction('📻', messageID, () => {}, true);
  api.sendMessage(
    `📻 ${bold('PHILIPPINES RADIO')}\n` +
    `📡 ${bold('Nahanap:')} ${station.name}${station.freq ? ' — ' + station.freq + ' MHz/AM' : ''}\n` +
    `🏙️ ${bold('City:')} ${station.city}\n` +
    `⏳ ${bold('Nag-re-record ng 30 seconds... please wait...')}`,
    threadID
  );

  const ts = Date.now();
  const outPath = path.join(TEMP_DIR, `radio_${ts}.mp3`);

  try {
    // Capture 30 seconds from the live stream
    await run(
      `ffmpeg -y -i "${station.url}" -t ${CLIP_SECONDS} -vn -ar 44100 -ac 2 -b:a 64k "${outPath}"`,
      { timeout: 50000 }
    );

    const stat = await fs.stat(outPath);
    if (stat.size < 5000) throw new Error('Stream returned empty audio. Station may be offline.');

    api.setMessageReaction('✅', messageID, () => {}, true);

    return api.sendMessage({
      body:
        `📻 ${bold('LIVE RADIO — 30-sec clip')}\n` +
        `📡 ${bold(station.name)}\n` +
        (station.freq ? `📶 ${bold('Frequency:')} ${station.freq}\n` : '') +
        `🏙️ ${bold('City:')} ${station.city}\n` +
        `🔴 ${bold('LIVE NOW')} — ${new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })} PHT\n` +
        `🏷️ ${bold(TEAM)}\n` +
        `📥 Hold & save to keep the clip!`,
      attachment: fs.createReadStream(outPath)
    }, threadID, () => cleanup(outPath));

  } catch (e) {
    cleanup(outPath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[Radio Error]', station.name, e.message);
    return api.sendMessage(
      `❌ ${bold('Hindi ma-stream ang ' + station.name)}\n` +
      `🔧 ${e.message?.slice(0, 150)}\n\n` +
      `💡 ${bold('Possible reasons:')}\n` +
      `• Station ay offline ngayon\n` +
      `• Naka-block ang stream URL\n` +
      `• Subukan ng ibang station: ${P}radio list`,
      threadID, messageID
    );
  }
};
