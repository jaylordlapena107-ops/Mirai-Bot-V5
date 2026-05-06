/**
 * !eval / !exec — Execute JavaScript code (Owner only)
 * Adapted from Prince's eval module for Mirai Bot V3
 * TEAM STARTCOPE BETA
 */

const util = require('util');
const bold = require('../../utils/bold');

module.exports.config = {
  name:            'eval',
  version:         '1.0.0',
  hasPermssion:    3,
  credits:         'Prince | TEAM STARTCOPE BETA',
  description:     'Execute JavaScript code — Owner only',
  commandCategory: 'Admin',
  usages:          '[js code]',
  cooldowns:       5,
  aliases:         ['exec']
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const code = args.join(' ').trim();

  if (!code) {
    return api.sendMessage(
      `💻 ${bold('EVAL')} 💻\n\n` +
      `⚠️ ${bold('Enter code to execute.')}\n` +
      `💡 Usage: !eval <code>\n` +
      `📌 Example: !eval return 1+1\n\n` +
      `🔒 ${bold('Owner only')}`,
      threadID, messageID
    );
  }

  const logs    = [];
  const realLog = console.log.bind(console);

  console.log = (...logArgs) => {
    for (let arg of logArgs) {
      if (typeof arg === 'object' && arg !== null) {
        arg = util.inspect(arg, { depth: 2, compact: false, colors: false });
      }
      logs.push(String(arg));
      realLog(arg);
    }
  };

  const header = `💻 ${bold('EVAL')} 💻\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  let result;

  try {
    result = await eval(`(async () => { ${code} })()`);

    if (result === undefined) result = 'NO OUTPUT';

    if (typeof result === 'object' && result !== null) {
      result = util.inspect(result, { depth: 2, compact: false, colors: false });
    } else {
      result = String(result);
    }

    if (result.length > 3000) result = result.slice(0, 3000) + '\n\n[TRUNCATED]';

    let output = bold('✅ OUTPUT:\n') + result;
    if (logs.length) {
      output += '\n\n' + bold('📋 LOGS:\n') + logs.join('\n');
    }

    return api.sendMessage(header + output, threadID, messageID);
  } catch (err) {
    return api.sendMessage(
      header + bold('❌ Error:\n') + err.stack?.slice(0, 2000),
      threadID, messageID
    );
  } finally {
    console.log = realLog;
  }
};
