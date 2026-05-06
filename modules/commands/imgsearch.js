/**
 * !imgsearch — Free image search using DuckDuckGo (no API key)
 * Searches Google/web images, sends top result to chat
 * TEAM STARTCOPE BETA
 */

const axios  = require('axios');
const fs     = require('fs-extra');
const path   = require('path');
const bold   = require('../../utils/bold');

const TEAM     = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/imgsearch_temp');
fs.ensureDirSync(TEMP_DIR);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Get DuckDuckGo VQD token ──────────────────────────────────────────────────
async function getVqd(query) {
  const res = await axios.get('https://duckduckgo.com/', {
    params: { q: query, iax: 'images', ia: 'images' },
    headers: { 'User-Agent': UA },
    timeout: 12000
  });
  const match = res.data.match(/vqd=['"]([^'"]+)['"]/);
  if (!match) throw new Error('Could not get DuckDuckGo VQD token');
  return match[1];
}

// ── DuckDuckGo image search ───────────────────────────────────────────────────
async function ddgSearch(query, limit = 5) {
  const vqd = await getVqd(query);
  const res  = await axios.get('https://duckduckgo.com/i.js', {
    params: { l: 'us-en', o: 'json', q: query, vqd, f: ',,,', p: '1' },
    headers: {
      'User-Agent': UA,
      'Referer':    'https://duckduckgo.com/',
      'Accept':     'application/json, text/javascript, */*; q=0.01',
    },
    timeout: 12000
  });
  return (res.data?.results || []).slice(0, limit);
}

// ── Download image ────────────────────────────────────────────────────────────
async function downloadImage(url) {
  const ext  = url.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
  const fp   = path.join(TEMP_DIR, `img_${Date.now()}.${ext}`);
  const res  = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: { 'User-Agent': UA, 'Referer': 'https://duckduckgo.com/' },
    maxContentLength: 20 * 1024 * 1024 // 20MB max
  });
  fs.writeFileSync(fp, Buffer.from(res.data));
  return fp;
}

function cleanup(fp) { setTimeout(() => fs.remove(fp).catch(() => {}), 120000); }

// ── Command ───────────────────────────────────────────────────────────────────
module.exports.config = {
  name:            'imgsearch',
  version:         '1.0.0',
  hasPermssion:    0,
  credits:         TEAM,
  description:     'Search and send images from the web — free, no API key',
  commandCategory: 'Utility',
  usages:          '[search query] | [query] -n (send multiple)',
  cooldowns:       5,
  aliases:         ['imgs', 'image', 'gimg']
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (!args.length) {
    return api.sendMessage(
      `🔍 ${bold('IMAGE SEARCH')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆓 Free — Powered by DuckDuckGo\n\n` +
      `📋 ${bold('USAGE:')}\n` +
      `• !imgsearch [query]        — 1 image\n` +
      `• !imgsearch [query] -3     — 3 images\n\n` +
      `📌 ${bold('EXAMPLES:')}\n` +
      `• !imgsearch sunset beach Philippines\n` +
      `• !imgsearch anime girl -3\n` +
      `• !imgsearch nature wallpaper -5\n\n` +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  // Parse -N flag for multiple images
  let count   = 1;
  let filtered = [...args];
  const flagIdx = filtered.findIndex(a => /^-(\d+)$/.test(a));
  if (flagIdx !== -1) {
    count = Math.min(5, Math.max(1, parseInt(filtered[flagIdx].slice(1))));
    filtered.splice(flagIdx, 1);
  }
  const query = filtered.join(' ').trim();
  if (!query) return api.sendMessage(`❌ Lagyan ng search query!`, threadID, messageID);

  api.setMessageReaction('🔍', messageID, () => {}, true);

  try {
    const results = await ddgSearch(query, count + 3); // fetch extras as fallback

    if (!results.length) throw new Error('No results found');

    let sent  = 0;
    let tried = 0;

    while (sent < count && tried < results.length) {
      const r = results[tried++];
      try {
        const fp = await downloadImage(r.image);
        const caption =
          `🖼️ ${bold('IMAGE RESULT')} ${count > 1 ? `(${sent + 1}/${count})` : ''}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔍 ${bold('Query:')} ${query}\n` +
          `📌 ${bold('Source:')} ${r.source || 'Web'}\n` +
          `🏷️ ${bold(TEAM)}`;

        await new Promise((resolve) => {
          api.sendMessage({ body: caption, attachment: fs.createReadStream(fp) },
            threadID, () => { cleanup(fp); resolve(); });
        });
        sent++;
        if (sent < count) await new Promise(r => setTimeout(r, 1200));
      } catch { /* try next result */ }
    }

    api.setMessageReaction('✅', messageID, () => {}, true);
    if (!sent) throw new Error('Could not download any images');

  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(
      `❌ ${bold('Image search failed.')}\n🔧 ${e.message}\n💡 Try a different query.`,
      threadID, messageID
    );
  }
};
