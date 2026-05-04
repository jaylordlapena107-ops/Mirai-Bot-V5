const bold = require('../../utils/bold');

module.exports.config = {
    name: "qtv",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "Niiozic",
    description: "Add or remove group admins",
    commandCategory: "Group",
    usages: "[add/remove @mention/reply]",
    cooldowns: 5
};

module.exports.run = async function ({ event, api, Users, Threads, args }) {
    if (!args[0]) return api.sendMessage(
        `⚠️ ${bold('Usage:')} qtv add/remove [@mention or reply]`, event.threadID
    );

    let dataThread = (await Threads.getData(event.threadID)).threadInfo;
    if (!dataThread || (!dataThread.adminIDs.some(item => item.id == api.getCurrentUserID()) && !dataThread.adminIDs.some(item => item.id == event.senderID))) {
        return api.sendMessage(`❎ ${bold('Permission Denied')}\nYou need to be a group admin.`, event.threadID, event.messageID);
    }

    let uid = event.type == "message_reply"
        ? event.messageReply.senderID
        : Object.keys(event.mentions)[0] || event.senderID;

    if (args[0] == 'add' || args[0] == 'remove') {
        api.sendMessage(
            `📌 ${bold('Confirm Action')}\n🔸 Action: ${args[0].toUpperCase()} admin\n💬 React to this message to confirm`,
            event.threadID,
            (error, info) => {
                global.client.handleReaction.push({
                    name: module.exports.config.name,
                    type: args[0],
                    messageID: info.messageID,
                    author: event.senderID,
                    userID: uid
                });
            }
        );
    }
};

module.exports.handleReaction = async function ({ event, api, handleReaction, Users }) {
    if (event.userID != handleReaction.author) return;
    const name = (await Users.getData(handleReaction.userID))?.name || "User";

    if (handleReaction.type == 'add') {
        api.changeAdminStatus(event.threadID, handleReaction.userID, true, (err) => {
            if (err) return api.sendMessage(`❎ ${bold('Failed!')} Bot needs admin permission.`, event.threadID, event.messageID);
            return api.sendMessage(`✅ ${bold('Success!')}\n👑 ${name} has been added as group admin.`, event.threadID, event.messageID);
        });
    }
    if (handleReaction.type == 'remove') {
        api.changeAdminStatus(event.threadID, handleReaction.userID, false, (err) => {
            if (err) return api.sendMessage(`❎ ${bold('Failed!')} Bot needs admin permission.`, event.threadID, event.messageID);
            return api.sendMessage(`✅ ${bold('Success!')}\n👤 Removed admin from ${name}.`, event.threadID, event.messageID);
        });
    }
};
