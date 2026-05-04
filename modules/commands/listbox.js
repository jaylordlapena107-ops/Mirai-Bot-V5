const bold = require('../../utils/bold');

module.exports.config = {
    name: 'listbox',
    version: '1.0.0',
    credits: 'ManhG',
    hasPermssion: 3,
    description: 'List / Ban / Unban / Remove groups the bot has joined',
    commandCategory: 'System',
    images: [],
    usages: '[page number / all]',
    cooldowns: 5
};

module.exports.handleReply = async function({ api, event, args, Threads, handleReply }) {
    const { threadID, messageID } = event;
    if (parseInt(event.senderID) !== parseInt(handleReply.author)) return;
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Manila").format("hh:mm A | MMM D YYYY");
    var arg = event.body.split(" ");

    switch (handleReply.type) {
        case "reply": {
            if (arg[0] == "ban" || arg[0] == "Ban") {
                var nums = event.body.split(" ").map(n => parseInt(n)).filter(n => !isNaN(n));
                var msg = "";
                for (let num of nums) {
                    var idgr = handleReply.groupid[num - 1];
                    var groupName = handleReply.groupName[num - 1];
                    const data = (await Threads.getData(idgr)).data || {};
                    data.banned = true;
                    data.dateAdded = time;
                    await Threads.setData(idgr, { data });
                    global.data.threadBanned.set(idgr, { dateAdded: data.dateAdded });
                    api.sendMessage(
                        `🚫 ${bold('Group Banned')}\n📋 Contact admin to get unbanned.\n🔗 ${global.config.FACEBOOK_ADMIN}`,
                        idgr
                    );
                    msg += `✅ ${groupName} → Banned\n`;
                }
                api.sendMessage(`╔══════════════╗\n║ 🚫 ${bold('BAN RESULT')} ║\n╚══════════════╝\n\n${msg}`, threadID, () => api.unsendMessage(handleReply.messageID));
                break;
            }
            if (arg[0] == "unban" || arg[0] == "ub") {
                var nums = event.body.split(" ").map(n => parseInt(n)).filter(n => !isNaN(n));
                var msg = "";
                for (let num of nums) {
                    var idgr = handleReply.groupid[num - 1];
                    var groupName = handleReply.groupName[num - 1];
                    const data = (await Threads.getData(idgr)).data || {};
                    data.banned = false;
                    data.dateAdded = null;
                    await Threads.setData(idgr, { data });
                    global.data.threadBanned.delete(idgr);
                    api.sendMessage(`🎊 ${bold('Unbanned!')}\nYour group is now free to use the bot!`, idgr);
                    msg += `✅ ${groupName} → Unbanned\n`;
                }
                api.sendMessage(`╔══════════════╗\n║ 🎊 ${bold('UNBAN')}      ║\n╚══════════════╝\n\n${msg}`, threadID, () => api.unsendMessage(handleReply.messageID));
                break;
            }
            if (arg[0] == "out" || arg[0] == "Out") {
                var nums = event.body.split(" ").map(n => parseInt(n)).filter(n => !isNaN(n));
                var msg = "";
                for (let num of nums) {
                    var idgr = handleReply.groupid[num - 1];
                    var groupName = handleReply.groupName[num - 1];
                    api.removeUserFromGroup(`${api.getCurrentUserID()}`, idgr);
                    msg += `✅ Left: ${groupName}\n`;
                }
                api.sendMessage(`╔══════════════╗\n║ 🚪 ${bold('LEFT GROUPS')} ║\n╚══════════════╝\n\n${msg}`, threadID, () => api.unsendMessage(handleReply.messageID));
                break;
            }
        }
    }
};

module.exports.run = async function({ api, event, args }) {
    try {
        var inbox = await api.getThreadList(100, null, ['INBOX']);
        let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
        var listbox = list.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0));
        var groupid = [], groupName = [];
        var page = parseInt(args[0]) || 1;
        if (page < 1) page = 1;
        var limit = args[0] === "all" ? 99999 : 30;
        var numPage = Math.ceil(listbox.length / limit);
        var msg = `╔══════════════════╗\n║  📋 ${bold('LIST GROUPS')}   ║\n╚══════════════════╝\n\n`;

        for (var i = limit * (page - 1); i < Math.min(limit * page, listbox.length); i++) {
            let group = listbox[i];
            msg += `${i + 1}. ${bold(group.name || "Unnamed")}\n   🆔 ${group.threadID}\n   👥 ${group.participants?.length || '?'} members\n   💬 ${group.messageCount || 0} msgs\n\n`;
            groupid.push(group.threadID);
            groupName.push(group.name || "Unnamed");
        }

        msg += `📄 Page ${page}/${numPage} | 📊 Total: ${listbox.length} groups\n`;
        msg += `\n💬 Reply: ${bold('Out')} / ${bold('Ban')} / ${bold('Unban')} + number(s)`;

        api.sendMessage(msg, event.threadID, (e, data) => {
            if (data) global.client.handleReply.push({
                name: module.exports.config.name,
                author: event.senderID,
                messageID: data.messageID,
                groupid, groupName,
                type: 'reply'
            });
        });
    } catch (e) {
        console.log(e);
    }
};
