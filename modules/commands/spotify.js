const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const playdl = require('play-dl');
const bold = require('../../utils/bold');

const VERSION = '2.0.0';
const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/spotify_temp');
fs.ensureDirSync(TEMP_DIR);

let scReady = false;

// Initialize SoundCloud client ID once on first use
async function ensureSC() {
  if (scReady) return;
  const id = await playdl.getFreeClientID();
  await playdl.setToken({ soundcloud: { client_id: id } });
  scReady = true;
}

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 600000);
}

function run(cmd) {
  return new Promise((res, rej) =>
    exec(cmd, { maxBuffer: 1024 * 1024 * 200 }, (e, _, se) =>
      e ? rej(new Error(se?.slice(0, 300) || e.message)) : res()
    )
  );
}

async function searchAndDownload(query, rawPath) {
  await ensureSC();

  // Search SoundCloud
  const results = await playdl.search(query, {
    source: { soundcloud: 'tracks' },
    limit: 5
  });

  if (!results.length) throw new Error('No results found for: ' + query);

  // Try each result until one streams successfully
  for (const track of results) {
    try {
      const stream = await playdl.stream(track.url);
      await new Promise((res, rej) => {
        const writer = fs.createWriteStream(rawPath);
        stream.stream.pipe(writer);
        writer.on('finish', res);
        writer.on('error', rej);
        stream.stream.on('error', rej);
      });
      const stat = await fs.stat(rawPath);
      if (stat.size < 10000) throw new Error('File too small');
      return { title: track.name, artist: track.user?.name || '', url: track.permalink_url || track.url };
    } catch (e) {
      await fs.remove(rawPath).catch(() => {});
      continue;
    }
  }
  throw new Error('Could not stream any result. Try a different search.');
}

module.exports.config = {
  name: 'spotify',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Search and send any song as audio — powered by SoundCloud (FREE)',
  commandCategory: 'Music',
  usages: '[song name / artist]',
  cooldowns: 20
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';

  if (!args.length) {
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  🎧 ${bold('SPOTIFY v' + VERSION)}              ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `🎵 ${bold('Search & send any song — FREE!')}\n\n` +
      `📋 ${bold('PAANO GAMITIN:')}\n${'─'.repeat(30)}\n\n` +
      `🎧 ${P}spotify [song name]\n` +
      `🎧 ${P}spotify [song] [artist]\n\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}spotify We Belong Together Mariah Carey\n` +
      `• ${P}spotify My Heart Will Go On Celine Dion\n` +
      `• ${P}spotify Ikaw lang OPM\n` +
      `• ${P}spotify Shape of You Ed Sheeran\n` +
      `• ${P}spotify Kung Di Rin Lang Ikaw\n\n` +
      `📥 ${bold('Pwedeng i-download ang audio!')} 🎵`,
      threadID, messageID
    );
  }

  const query = args.join(' ').trim();

  api.setMessageReaction('🎧', messageID, () => {}, true);
  api.sendMessage(
    `🔍 ${bold('Hinahanap ang kanta...')}\n` +
    `🎵 ${bold('Search:')} ${query}\n` +
    `⏳ ${bold('Please wait (10–25 seconds)...')}`,
    threadID
  );

  const ts = Date.now();
  const rawPath = path.join(TEMP_DIR, `raw_${ts}`);
  const outPath = path.join(TEMP_DIR, `out_${ts}.mp3`);

  try {
    const { title, artist, url } = await searchAndDownload(query, rawPath);

    // Convert raw stream to MP3
    await run(`ffmpeg -y -i "${rawPath}" -vn -ar 44100 -ac 2 -b:a 128k "${outPath}"`);
    cleanup(rawPath);

    api.setMessageReaction('✅', messageID, () => {}, true);

    return api.sendMessage({
      body:
        `🎧 ${bold('SPOTIFY')} — ${bold('Found!')}\n` +
        `🎵 ${bold(title)}\n` +
        (artist ? `👤 ${bold(artist)}\n` : '') +
        `🏷️ ${bold(TEAM)}\n` +
        `📥 Hold & save to download!`,
      attachment: fs.createReadStream(outPath)
    }, threadID, () => cleanup(outPath));

  } catch (e) {
    cleanup(rawPath, outPath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[Spotify Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('Hindi mahanap ang kanta.')}\n` +
      `🔧 ${e.message?.slice(0, 200)}\n` +
      `💡 Subukan ng ibang title o artist name.`,
      threadID, messageID
    );
  }
};
