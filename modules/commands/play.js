const bold = require('../../utils/bold');

const VERSION = '2.0.0';
const TEAM = 'TEAM STARTCOPE BETA';

// Home Radio 95.1 Naga — live stream
const STREAM_URL = 'https://hrmanila.radioca.st/stream';
const STREAM_NAME = 'HOME RADIO 95.1 NAGA';

module.exports.config = {
  name: 'play',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'I-stream ang HOME RADIO 95.1 NAGA — live online, walang time limit',
  commandCategory: 'Media',
  usages: '',
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  api.setMessageReaction('📻', messageID, () => {}, true);

  const now = new Date().toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return api.sendMessage(
    `📻 ${bold('HOME RADIO 95.1 NAGA')}\n` +
    `🔴 ${bold('LIVE ONLINE — ' + now + ' PHT')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🌟 ${bold('ANG PAGBABALIK NGAYON 2026!')}\n` +
    `📍 ${bold('NASA GAWAD KALINGA NA')}\n` +
    `🎙️ ${bold('ONLINE LIVE SA MOR NAGA')}\n\n` +
    `🎵 I-click para makinig ng LIVE:\n` +
    `${STREAM_URL}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📡 ${bold('STREAMING NOW — WALANG PUTOL')}\n` +
    `🏷️ ${bold(TEAM)}`,
    threadID,
    messageID
  );
};
