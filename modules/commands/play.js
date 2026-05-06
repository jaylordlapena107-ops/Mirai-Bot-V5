const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const bold = require('../../utils/bold');

const VERSION = '1.0.0';
const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/play_temp');
fs.ensureDirSync(TEMP_DIR);

// Home Radio 95.1 Manila — live stream URL (discovered from onlineradio.ph)
const STREAM_URL = 'https://hrmanila.radioca.st/stream';
const STREAM_NAME = 'Home Radio 95.1 FM Manila';
const CLIP_SECONDS = 60; // 60-second live clip

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 600000);
}

function captureStream(outPath) {
  return new Promise((res, rej) => {
    const cmd = `ffmpeg -y -i "${STREAM_URL}" -t ${CLIP_SECONDS} -vn -ar 44100 -ac 2 -b:a 64k "${outPath}"`;
    exec(cmd, { timeout: 90000 }, (err, _, stderr) => {
      if (err) return rej(new Error(stderr?.slice(-300) || err.message));
      res();
    });
  });
}

module.exports.config = {
  name: 'play',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Plays Home Radio 95.1 FM Manila live — sends a 60-second live voice clip',
  commandCategory: 'Media',
  usages: '',
  cooldowns: 30
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  api.setMessageReaction('📻', messageID, () => {}, true);
  api.sendMessage(
    `📻 ${bold('HOME RADIO 95.1 FM')}\n` +
    `📡 ${bold('Connecting to live stream...')}\n` +
    `🔴 ${bold('LIVE')} — Recording 60 seconds...\n` +
    `⏳ Please wait (15–25 seconds)`,
    threadID
  );

  const ts = Date.now();
  const outPath = path.join(TEMP_DIR, `live_${ts}.mp3`);

  try {
    await captureStream(outPath);

    const stat = await fs.stat(outPath);
    if (stat.size < 10000) throw new Error('Stream returned empty audio. Station may be offline.');

    const now = new Date().toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    api.setMessageReaction('✅', messageID, () => {}, true);

    return api.sendMessage({
      body:
        `📻 ${bold('HOME RADIO 95.1 FM MANILA')}\n` +
        `🔴 ${bold('LIVE NOW')} — ${now} PHT\n` +
        `⏱️ ${bold('60-second live clip')}\n` +
        `🎵 OPM · Love Songs · Hits\n` +
        `🏷️ ${bold(TEAM)}\n` +
        `📥 Hold & save to keep the audio!`,
      attachment: fs.createReadStream(outPath)
    }, threadID, () => cleanup(outPath));

  } catch (e) {
    cleanup(outPath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[Play Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('Hindi ma-stream ang Home Radio 95.1')}\n` +
      `🔧 ${e.message?.slice(0, 150)}\n\n` +
      `💡 ${bold('Possible reasons:')}\n` +
      `• Station ay offline ngayon\n` +
      `• Check internet connection\n` +
      `• Subukan ulit mamaya`,
      threadID, messageID
    );
  }
};
