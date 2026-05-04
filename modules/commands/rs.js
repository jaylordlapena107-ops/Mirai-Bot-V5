const bold = require('../../utils/bold');

module.exports.config = {
    name: "rs",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "DongDev",
    description: "Restart the bot.",
    commandCategory: "Admin",
    usages: "[]",
    cooldowns: 0,
};

module.exports.run = ({ event, api }) => {
    api.sendMessage(
        `🔄 ${bold('Restarting bot...')}\n⏳ Please wait a moment...`,
        event.threadID,
        () => process.exit(1),
        event.messageID
    );
};
