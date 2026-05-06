const { spawn } = require('child_process');
const { PassThrough } = require('stream');
const bold = require('../../utils/bold');

const VERSION = '3.0.0';
const TEAM = 'TEAM STARTCOPE BETA';

const STREAM_URL = 'https://hrmanila.radioca.st/stream';

// Active stream processes per thread (so we don't stack duplicates)
const activeStreams = new Map();

module.exports.config = {
  name: 'play',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Live-stream HOME RADIO 95.1 NAGA — direct audio, walang putol, no record',
  commandCategory: 'Media',
  usages: '',
  cooldowns: 10
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  // If already streaming in this thread, kill the old one first
  if (activeStreams.has(threadID)) {
    try { activeStreams.get(threadID).kill('SIGKILL'); } catch {}
    activeStreams.delete(threadID);
  }

  api.setMessageReaction('📻', messageID, () => {}, true);

  // Create a PassThrough so we control the stream lifecycle
  const audioPass = new PassThrough();

  // Spawn ffmpeg: read live radio, encode to MP3, pipe directly to stdout
  // No -t flag = no time limit, streams continuously until killed
  const ffmpeg = spawn('ffmpeg', [
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', STREAM_URL,
    '-vn',
    '-ar', '44100',
    '-ac', '2',
    '-b:a', '64k',
    '-f', 'mp3',
    'pipe:1'
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  activeStreams.set(threadID, ffmpeg);

  // Pipe ffmpeg stdout directly into the audio stream
  ffmpeg.stdout.pipe(audioPass);

  ffmpeg.on('error', (err) => {
    console.error('[Play] ffmpeg error:', err.message);
    audioPass.destroy();
    activeStreams.delete(threadID);
    api.sendMessage(
      `❌ ${bold('Hindi ma-stream ang Home Radio 95.1')}\n` +
      `🔧 ${err.message?.slice(0, 120)}\n` +
      `💡 Subukan ulit: !play`,
      threadID
    );
  });

  ffmpeg.on('close', (code) => {
    console.log(`[Play] ffmpeg exited (code ${code}) for thread ${threadID}`);
    if (!audioPass.destroyed) audioPass.end();
    activeStreams.delete(threadID);
  });

  // Send the piped stream as a pure voice audio attachment — no text
  api.sendMessage(
    { attachment: audioPass },
    threadID,
    (err) => {
      if (err) {
        console.error('[Play] sendMessage error:', err.message?.slice(0, 120));
        try { ffmpeg.kill('SIGKILL'); } catch {}
        activeStreams.delete(threadID);
        api.sendMessage(
          `❌ ${bold('Hindi natanggap ng Messenger ang live stream.')}\n` +
          `💡 Subukan ulit: !play\n` +
          `🔧 ${err.message?.slice(0, 100)}`,
          threadID
        );
      } else {
        api.setMessageReaction('✅', messageID, () => {}, true);
      }
    }
  );
};
