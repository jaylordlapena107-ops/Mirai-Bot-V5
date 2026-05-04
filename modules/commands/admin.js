const fs = require('fs');
const bold = require('../../utils/bold');

module.exports.config = {
    name: "admin",
    version: "1.0.1",
    hasPermssion: 3,
    credits: "quocduy & AI",
    description: "Manage bot admins",
    commandCategory: "Admin",
    usages: "admin [list/add/remove] [userID]",
    cooldowns: 2,
};

module.exports.run = async function({ api, event, args }) {
    const configPath = './config.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const admins = config.ADMINBOT || [];
    const { threadID, messageID } = event;

    switch (args[0]) {
        case "list": {
            if (admins.length === 0) return api.sendMessage(`📋 ${bold('No bot admins found.')}`, threadID, messageID);
            let msg = `╔══════════════════╗\n║  👑 ${bold('BOT ADMINS')}    ║\n╚══════════════════╝\n\n`;
            admins.forEach((id, i) => { msg += `${i + 1}. 🆔 ${id}\n`; });
            return api.sendMessage(msg, threadID, messageID);
        }
        case "add": {
            const newID = args[1];
            if (!newID) return api.sendMessage(`⚠️ ${bold('Please provide a user ID.')}`, threadID, messageID);
            if (admins.includes(newID)) return api.sendMessage(`❎ ${bold('Already an admin:')} ${newID}`, threadID, messageID);
            admins.push(newID);
            config.ADMINBOT = admins;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            global.config.ADMINBOT = admins;
            return api.sendMessage(`✅ ${bold('Added admin:')} ${newID}`, threadID, messageID);
        }
        case "remove": {
            const removeID = args[1];
            if (!removeID) return api.sendMessage(`⚠️ ${bold('Please provide a user ID.')}`, threadID, messageID);
            if (!admins.includes(removeID)) return api.sendMessage(`❎ ${bold('Not an admin:')} ${removeID}`, threadID, messageID);
            config.ADMINBOT = admins.filter(id => id !== removeID);
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            global.config.ADMINBOT = config.ADMINBOT;
            return api.sendMessage(`✅ ${bold('Removed admin:')} ${removeID}`, threadID, messageID);
        }
        default:
            return api.sendMessage(
                `╔══════════════════╗\n║  📖 ${bold('ADMIN HELP')}   ║\n╚══════════════════╝\n\n` +
                `📋 admin list → view all admins\n` +
                `➕ admin add [ID] → add admin\n` +
                `➖ admin remove [ID] → remove admin`,
                threadID, messageID
            );
    }
};
