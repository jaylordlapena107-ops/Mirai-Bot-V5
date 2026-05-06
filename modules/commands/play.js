const bold = require('../../utils/bold');

const VERSION = '4.0.0';
const TEAM = 'TEAM STARTCOPE BETA';

// Home Radio 95.1 Naga — live online stream URL
const STREAM_URL = 'https://hrmanila.radioca.st/stream';

module.exports.config = {
  name: 'play',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Online streaming link ng HOME RADIO 95.1 NAGA — live, walang upload',
  commandCategory: 'Media',
  usages: '',
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  api.setMessageReaction('📻', messageID, () => {}, true);

  return api.sendMessage(
    `${STREAM_URL}`,
    threadID,
    () => api.setMessageReaction('✅', messageID, () => {}, true)
  );
};
