const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const VERSION = '5.0.0';
const TEAM = 'TEAM STARTCOPE BETA';
const STREAM_URL = 'https://hrmanila.radioca.st/stream';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/play_temp');
const CHUNK_SECONDS = 10800; // 3 hours per voice message chunk

fs.ensureDirSync(TEMP_DIR);

// Per-thread loop control
const activeLoops = new Map(); // threadID → { running: true/false }

function captureChunk(outPath) {
  return new Promise((res, rej) => {
    const cmd = [
      'ffmpeg -y',
      '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
      `-i "${STREAM_URL}"`,
      `-t ${CHUNK_SECONDS}`,
      '-vn -ar 44100 -ac 2 -b:a 64k',
      `-f mp3 "${outPath}"`
    ].join(' ');
    exec(cmd, { timeout: (CHUNK_SECONDS + 120) * 1000 }, (err, _, stderr) => {
      if (err) return rej(new Error(stderr?.slice(-200) || err.message));
      res();
    });
  });
}

async function streamLoop(api, threadID, ctrl) {
  let chunkIndex = 0;
  while (ctrl.running) {
    const outPath = path.join(TEMP_DIR, `chunk_${threadID}_${chunkIndex++}.mp3`);
    try {
      await captureChunk(outPath);
      if (!ctrl.running) { fs.remove(outPath).catch(() => {}); break; }
      const stat = await fs.stat(outPath);
      if (stat.size < 5000) throw new Error('Empty audio — station may be offline');
      await new Promise((res, rej) => {
        api.sendMessage(
          { attachment: fs.createReadStream(outPath) },
          threadID,
          (err) => {
            fs.remove(outPath).catch(() => {});
            err ? rej(err) : res();
          }
        );
      });
    } catch (e) {
      fs.remove(outPath).catch(() => {});
      console.error(`[Play] chunk error thread ${threadID}:`, e.message?.slice(0, 120));
      if (!ctrl.running) break;
      // Wait 5s before retrying on error
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  activeLoops.delete(threadID);
  console.log(`[Play] Stream stopped for thread ${threadID}`);
}

module.exports.config = {
  name: 'play',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Mag-sesend ng voice message audio mula sa HOME RADIO 95.1 NAGA — sunod-sunod, walang putol',
  commandCategory: 'Media',
  usages: '',
  cooldowns: 10
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  // Stop existing loop for this thread if any
  if (activeLoops.has(threadID)) {
    activeLoops.get(threadID).running = false;
    activeLoops.delete(threadID);
  }

  api.setMessageReaction('📻', messageID, () => {}, true);

  const ctrl = { running: true };
  activeLoops.set(threadID, ctrl);

  // Start streaming in background — voice messages sent automatically, one after another
  streamLoop(api, threadID, ctrl);
};

// Expose so !stop command can access
module.exports.activeLoops = activeLoops;
