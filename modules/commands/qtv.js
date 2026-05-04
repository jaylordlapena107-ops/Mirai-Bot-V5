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
    if (!args[0]) return api.sendMessage('⚠️ Usage: qtv add/remove [@mention or reply]', event.threadID);

    let dataThread = (await Threads.getData(event.threadID)).threadInfo;
    if (!dataThread || (!dataThread.adminIDs.some(item => item.id == api.getCurrentUserID()) && !dataThread.adminIDs.some(item => item.id == event.senderID))) {
        return api.sendMessage('❎ You do not have permission to use this command.', event.threadID, event.messageID);
    }

    let uid1 = event.senderID;
    let uid = null;

    if (event.type == "message_reply") {
        uid = event.messageReply.senderID;
    } else if (args.join().indexOf('@') !== -1) {
        uid = Object.keys(event.mentions)[0];
    } else {
        uid = uid1;
    }

    if (args[0] == 'add' || args[0] == 'remove') {
        const type = args[0];
        api.sendMessage('📌 React to this message to confirm', event.threadID, (error, info) => {
            global.client.handleReaction.push({
                name: module.exports.config.name,
                type,
                messageID: info.messageID,
                author: uid1,
                userID: uid
            });
        });
    }
};

module.exports.handleReaction = async function ({ event, api, handleReaction, Users }) {
    if (event.userID != handleReaction.author) return;
    const name = (await Users.getData(handleReaction.userID))?.name || "User";

    if (handleReaction.type == 'add') {
        api.changeAdminStatus(event.threadID, handleReaction.userID, true, (err) => {
            if (err) return api.sendMessage("❎ Bot does not have enough permission to add admin.", event.threadID, event.messageID);
            return api.sendMessage(`✅ ${name} has been added as group admin.`, event.threadID, event.messageID);
        });
    }
    if (handleReaction.type == 'remove') {
        api.changeAdminStatus(event.threadID, handleReaction.userID, false, (err) => {
            if (err) return api.sendMessage("❎ Bot does not have enough permission to remove admin.", event.threadID, event.messageID);
            return api.sendMessage(`✅ Removed admin from ${name}.`, event.threadID, event.messageID);
        });
    }
};
