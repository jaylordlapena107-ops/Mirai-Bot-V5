const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const ytdl = require('@distube/ytdl-core');
const bold = require('../../utils/bold');

const VERSION = '1.0.0';
const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/spotify_temp');
fs.ensureDirSync(TEMP_DIR);

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000);
}

// Search YouTube and return first video ID + title
async function searchYouTube(query) {
  const encoded = encodeURIComponent(query + ' official audio');
  const res = await axios.get(`https://www.youtube.com/results?search_query=${encoded}&sp=EgIQAQ%3D%3D`, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  // Extract video IDs and titles from response
  const videoIds = [...res.data.matchAll(/"videoId":"([^"]{11})"/g)].map(m => m[1]);
  const titles   = [...res.data.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"/g)].map(m => m[1]);

  if (!videoIds.length) throw new Error('No results found on YouTube');
  return { videoId: videoIds[0], title: titles[0] || query };
}

// Download audio from YouTube video ID
async function downloadAudio(videoId, outPath) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const info = await ytdl.getInfo(url);
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
  const title = info.videoDetails.title;

  return new Promise((resolve, reject) => {
    const stream = ytdl.downloadFromInfo(info, { format });
    const writeStream = fs.createWriteStream(outPath);
    stream.pipe(writeStream);
    stream.on('error', reject);
    writeStream.on('finish', () => resolve(title));
    writeStream.on('error', reject);
  });
}

module.exports.config = {
  name: 'spotify',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Search and send any song as audio — powered by YouTube (FREE)',
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
      `• ${P}spotify Shape of You Ed Sheeran\n\n` +
      `📥 ${bold('Pwedeng i-download ang audio!')} 🎵`,
      threadID, messageID
    );
  }

  const query = args.join(' ').trim();

  api.setMessageReaction('🎧', messageID, () => {}, true);
  api.sendMessage(
    `🔍 ${bold('Hinahanap ang kanta...')}\n` +
    `🎵 ${bold('Search:')} ${query}\n` +
    `⏳ ${bold('Please wait (15–30 seconds)...')}`,
    threadID
  );

  const ts = Date.now();
  const rawPath = path.join(TEMP_DIR, `raw_${ts}.webm`);
  const outPath = path.join(TEMP_DIR, `out_${ts}.mp3`);

  try {
    // Step 1: Search YouTube
    const { videoId, title } = await searchYouTube(query);

    // Step 2: Download audio
    const realTitle = await downloadAudio(videoId, rawPath);

    // Step 3: Convert to MP3 using ffmpeg
    await new Promise((res, rej) =>
      exec(`ffmpeg -y -i "${rawPath}" -vn -ar 44100 -ac 2 -b:a 128k "${outPath}"`,
        { maxBuffer: 1024 * 1024 * 100 },
        (e, _, se) => e ? rej(new Error(se?.slice(0, 200) || e.message)) : res()
      )
    );
    cleanup(rawPath);

    api.setMessageReaction('✅', messageID, () => {}, true);

    return api.sendMessage({
      body: `🎧 ${bold('SPOTIFY')}\n🎵 ${bold(realTitle || title)}\n🔗 youtube.com/watch?v=${videoId}\n🏷️ ${bold(TEAM)}\n📥 Hold & save to download!`,
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
