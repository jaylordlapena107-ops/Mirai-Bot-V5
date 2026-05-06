const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';

module.exports.config = {
  name: 'stop',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'Ihinto ang !play voice stream sa thread na ito',
  commandCategory: 'Media',
  usages: '',
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  const playCmd = global.client.commands.get('play');
  const activeLoops = playCmd?.activeLoops;

  if (!activeLoops || !activeLoops.has(threadID)) {
    return api.sendMessage('Walang aktibong stream dito.', threadID, messageID);
  }

  activeLoops.get(threadID).running = false;
  activeLoops.delete(threadID);

  api.setMessageReaction('🛑', messageID, () => {}, true);
  return api.sendMessage('🛑 Stream stopped.', threadID, messageID);
};
