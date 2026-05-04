const bold = require('../../utils/bold');

module.exports.config = {
    name: "prefix",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "DongDev",
    description: "Show or check the bot prefix",
    commandCategory: "System",
    usages: "[]",
    cooldowns: 0
};

module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, body } = event;
    if (!body) return;

    const { PREFIX } = global.config;
    let threadSetting = global.data.threadData.get(threadID) || {};
    let prefix = threadSetting.PREFIX || PREFIX;
    const lowerBody = body.toLowerCase().trim();

    if (["prefix","what is the prefix","forgot prefix","how to use"].includes(lowerBody)) {
        api.sendMessage(
            `╔══════════════════╗\n║  ⌨️ ${bold('PREFIX INFO')}    ║\n╚══════════════════╝\n\n` +
            `📌 ${bold('Group Prefix:')} ${prefix}\n` +
            `⚙️ ${bold('System Prefix:')} ${PREFIX}\n\n` +
            `💡 Example: ${prefix}help`,
            threadID, event.messageID
        );
    }
};

module.exports.run = async function () {};
