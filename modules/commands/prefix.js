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

    if (
        lowerBody === "prefix" ||
        lowerBody === "what is the prefix" ||
        lowerBody === "forgot prefix" ||
        lowerBody === "how to use"
    ) {
        api.sendMessage(
            `✏️ Group prefix: ${prefix}\n📎 System prefix: ${PREFIX}`,
            threadID,
            event.messageID
        );
    }
};

module.exports.run = async function () {};
