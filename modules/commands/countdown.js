/**
 * !countdown — Live countdown timer with interval updates
 * TEAM STARTCOPE BETA
 */

const bold = require('../../utils/bold');

module.exports.config = {
  name:            'countdown',
  version:         '1.0.0',
  hasPermssion:    0,
  credits:         'TEAM STARTCOPE BETA',
  description:     'Live countdown timer with periodic updates',
  commandCategory: 'Utility',
  usages:          '[seconds] [label]',
  cooldowns:       10
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatTime(sec) {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function progressBar(current, total, len = 15) {
  const filled = Math.round((current / total) * len);
  const empty  = len - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const secs  = parseInt(args[0]);
  const label = args.slice(1).join(' ').trim() || 'Countdown';

  if (!secs || isNaN(secs) || secs < 1 || secs > 3600) {
    return api.sendMessage(
      `⏳ ${bold('COUNTDOWN TIMER')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ Usage: !countdown [1–3600 sec] [label]\n\n` +
      `📌 ${bold('Examples:')}\n` +
      `• !countdown 10\n` +
      `• !countdown 60 Game starts!\n` +
      `• !countdown 300 Break time\n\n` +
      `🏷️ ${bold('TEAM STARTCOPE BETA')}`,
      threadID, messageID
    );
  }

  // Send start message
  api.sendMessage(
    `⏳ ${bold('COUNTDOWN STARTED!')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 ${bold(label)}\n` +
    `⏱️ Duration: ${bold(formatTime(secs))}\n` +
    `${progressBar(0, secs)}\n\n` +
    `🏷️ ${bold('TEAM STARTCOPE BETA')}`,
    threadID
  );

  // Send milestone updates
  const milestones = [];

  if (secs > 10) {
    // Halfway
    milestones.push({ at: Math.floor(secs / 2), label: '50% — Halfway there!' });
  }
  if (secs > 30) {
    milestones.push({ at: 10, label: '10 seconds left!' });
  }
  if (secs > 10) {
    // 5-second warning
    milestones.push({ at: 5, label: '5 seconds!' });
  }

  // Sort milestones by time remaining (descending)
  milestones.sort((a, b) => b.at - a.at);

  let elapsed       = 0;
  let milestoneIdx  = 0;

  // Tick loop — check every second for milestones
  const interval = secs > 60 ? 5000 : 1000;

  while (elapsed < secs) {
    await sleep(interval);
    elapsed += interval / 1000;
    const remaining = Math.max(0, secs - elapsed);

    // Check milestones
    while (milestoneIdx < milestones.length && remaining <= milestones[milestoneIdx].at) {
      const m = milestones[milestoneIdx];
      api.sendMessage(
        `⏰ ${bold(m.label)}\n` +
        `📝 ${bold(label)}\n` +
        `⏱️ ${bold(formatTime(Math.ceil(remaining)))} remaining\n` +
        `${progressBar(elapsed, secs)}`,
        threadID
      );
      milestoneIdx++;
    }
  }

  // Final message with confetti
  await sleep(500);
  api.sendMessage(
    `🎉🎉🎉 ${bold("TIME'S UP!")} 🎉🎉🎉\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 ${bold(label)}\n` +
    `✅ ${bold(formatTime(secs))} completed!\n` +
    `${'█'.repeat(15)}\n\n` +
    `🏷️ ${bold('TEAM STARTCOPE BETA')}`,
    threadID
  );
};
