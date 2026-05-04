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
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss L");
    var arg = event.body.split(" ");

    switch (handleReply.type) {
        case "reply": {
            if (arg[0] == "ban" || arg[0] == "Ban") {
                var arrnum = event.body.split(" ");
                var msg = "";
                var nums = arrnum.map(n => parseInt(n));
                nums.shift();
                for (let num of nums) {
                    var idgr = handleReply.groupid[num - 1];
                    var groupName = handleReply.groupName[num - 1];
                    const data = (await Threads.getData(idgr)).data || {};
                    data.banned = true;
                    data.dateAdded = time;
                    var typef = await Threads.setData(idgr, { data });
                    global.data.threadBanned.set(idgr, { dateAdded: data.dateAdded });
                    msg += typef + ' ' + groupName + '\nTID: ' + idgr + "\n";
                }
                api.sendMessage(`=== [ BAN GROUP ] ===\n🎀 Received ban order from admin.\nContact admin to get unbanned.\n🌐 Admin: ${global.config.FACEBOOK_ADMIN}`, idgr);
                api.sendMessage(`[ BAN MODE ]\n(true/false)\n\n${msg}`, threadID, () => api.unsendMessage(handleReply.messageID));
                break;
            }

            if (arg[0] == "unban" || arg[0] == "Unban" || arg[0] == "ub") {
                var arrnum = event.body.split(" ");
                var msg = "";
                var nums = arrnum.map(n => parseInt(n));
                nums.shift();
                for (let num of nums) {
                    var idgr = handleReply.groupid[num - 1];
                    var groupName = handleReply.groupName[num - 1];
                    const data = (await Threads.getData(idgr)).data || {};
                    data.banned = false;
                    data.dateAdded = null;
                    var typef = await Threads.setData(idgr, { data });
                    global.data.threadBanned.delete(idgr);
                    msg += typef + ' ' + groupName + '\nTID: ' + idgr + "\n";
                }
                api.sendMessage(`=== [ UNBAN ] ===\n🎊 Your group has been unbanned!`, idgr);
                api.sendMessage(`[ UNBAN MODE ]\n(true/false)\n\n${msg}`, threadID, () => api.unsendMessage(handleReply.messageID));
                break;
            }

            if (arg[0] == "out" || arg[0] == "Out") {
                var arrnum = event.body.split(" ");
                var msg = "";
                var nums = arrnum.map(n => parseInt(n));
                nums.shift();
                for (let num of nums) {
                    var idgr = handleReply.groupid[num - 1];
                    var groupName = handleReply.groupName[num - 1];
                    api.removeUserFromGroup(`${api.getCurrentUserID()}`, idgr);
                    msg += groupName + '\n» TID: ' + idgr + "\n";
                }
                api.sendMessage(`=== [ Leave Group ] ===\n🎊 Bot has left the group as requested.`, idgr);
                api.sendMessage(`[ LEAVE MODE ]\n(true/false)\n\n${msg}`, threadID, () => api.unsendMessage(handleReply.messageID));
                break;
            }
        }
    }
};

module.exports.run = async function({ api, event, args }) {
    try {
        var inbox = await api.getThreadList(100, null, ['INBOX']);
        let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
        var listthread = [];

        for (var groupInfo of list) {
            listthread.push({
                id: groupInfo.threadID,
                name: groupInfo.name || "Unnamed",
                messageCount: groupInfo.messageCount || 0,
                participants: groupInfo.participants.length
            });
        }

        var listbox = listthread.sort((a, b) => b.participants - a.participants);
        var groupid = [];
        var groupName = [];
        var page = parseInt(args[0]) || 1;
        if (page < 1) page = 1;
        var limit = args[0] === "all" ? 100000 : 100;
        var numPage = Math.ceil(listbox.length / limit);
        var msg = "=====[ LIST GROUPS ]=====\n\n";

        for (var i = limit * (page - 1); i < limit * (page - 1) + limit; i++) {
            if (i >= listbox.length) break;
            let group = listbox[i];
            msg += `━━━━━━━━━━━━━━━━━━\n${i + 1}. ${group.name}\n[🔰] TID: ${group.id}\n[👤] Members: ${group.participants}\n[💬] Messages: ${group.messageCount}\n`;
            groupid.push(group.id);
            groupName.push(group.name);
        }

        msg += `\n→ Page ${page}/${numPage}\nUse ${global.config.PREFIX}listbox [page/all]\n`;

        api.sendMessage(msg + "━━━━━━━━━━━━━━━━━━\n→ Reply with: Out, Ban, Unban + number(s)", event.threadID, (e, data) => {
            if (data) global.client.handleReply.push({
                name: module.exports.config.name,
                author: event.senderID,
                messageID: data.messageID,
                groupid,
                groupName,
                type: 'reply'
            });
        });
    } catch (e) {
        return console.log(e);
    }
};
