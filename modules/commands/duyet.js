const fs = require("fs");
const path = require("path");
const bold = require("../../utils/bold");

module.exports.config = {
    name: "duyet",
    version: "1.0.2",
    hasPermssion: 2,
    credits: "DungUwU mod by DongDev",
    description: "Approve groups to use the bot",
    commandCategory: "Admin",
    usages: "[list/pending/del/help] [group ID]",
    cooldowns: 5,
    prefix: true
};

const dataPath = path.resolve(__dirname, "../../utils/data/approvedThreads.json");
const dataPendingPath = path.resolve(__dirname, "../../utils/data/pendingThreads.json");

module.exports.handleReply = async function ({ event, api, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    const { body, threadID, messageID } = event;
    let approvedThreads = JSON.parse(fs.readFileSync(dataPath));
    let pendingThreads = JSON.parse(fs.readFileSync(dataPendingPath));

    if (handleReply.type === "pending") {
        if (body.trim().toLowerCase() === "all") {
            approvedThreads = approvedThreads.concat(pendingThreads);
            fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
            fs.writeFileSync(dataPendingPath, JSON.stringify([], null, 2));
            pendingThreads.forEach(id => {
                api.sendMessage(`✅ ${bold('Approved!')}\n🎉 Your group has been approved!\n📝 Enjoy using the bot!`, id);
            });
            return api.sendMessage(`✅ ${bold('All Approved!')}\nApproved all ${pendingThreads.length} pending groups`, threadID, messageID);
        }
        const numbers = body.split(" ").map(num => parseInt(num.trim())).filter(num => !isNaN(num));
        let successCount = 0;
        for (let num of numbers) {
            const index = num - 1;
            if (index >= 0 && index < pendingThreads.length) {
                const idBox = pendingThreads[index];
                approvedThreads.push(idBox);
                api.sendMessage(`✅ ${bold('Approved!')}\n🎉 Your group has been approved!\n📝 Enjoy using ${global.config.BOTNAME}!`, idBox);
                pendingThreads.splice(index, 1);
                successCount++;
            }
        }
        fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
        fs.writeFileSync(dataPendingPath, JSON.stringify(pendingThreads, null, 2));
        return successCount > 0
            ? api.sendMessage(`✅ ${bold('Approved')} ${successCount} group(s)`, threadID, messageID)
            : api.sendMessage(`❎ No groups approved. Check the numbers.`, threadID, messageID);
    } else if (handleReply.type === "remove") {
        const idsToRemove = body.split(" ").map(num => parseInt(num) - 1).filter(index => approvedThreads[index]);
        if (idsToRemove.length) {
            const removedIds = [];
            for (const index of idsToRemove.sort((a, b) => b - a)) {
                const idBox = approvedThreads[index];
                removedIds.push(idBox);
                approvedThreads.splice(index, 1);
                await api.removeUserFromGroup(api.getCurrentUserID(), idBox);
            }
            fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
            return api.sendMessage(`✅ ${bold('Removed groups:')} ${removedIds.join(", ")}`, threadID, messageID);
        }
        return api.sendMessage(`❎ No groups to remove.`, threadID, messageID);
    }
};

module.exports.run = async ({ event, api, args, Threads }) => {
    const { threadID, messageID } = event;
    let approvedThreads = JSON.parse(fs.readFileSync(dataPath));
    let pendingThreads = JSON.parse(fs.readFileSync(dataPendingPath));
    let idBox = args[0] ? args[0] : threadID;

    if (args[0] === "list" || args[0] === "l") {
        let msg = `╔══════════════════╗\n║  ✅ ${bold('APPROVED GROUPS')} ║\n╚══════════════════╝\n\n`;
        for (let [index, id] of approvedThreads.entries()) {
            const threadData = await Threads.getData(id);
            const name = threadData?.threadInfo?.name || threadData?.threadInfo?.threadName || "Unknown";
            msg += `${index + 1}. ${bold(name)}\n   🆔 ${id}\n`;
        }
        return api.sendMessage(msg + `\n💬 Reply with the number to remove a group`, threadID, (error, info) => {
            if (!error) global.client.handleReply.push({ name: module.exports.config.name, messageID: info.messageID, author: event.senderID, type: "remove" });
        }, messageID);
    }

    if (args[0] === "pending" || args[0] === "p") {
        let msg = `╔══════════════════╗\n║  🕐 ${bold('PENDING GROUPS')} ║\n╚══════════════════╝\n\n`;
        for (let [index, id] of pendingThreads.entries()) {
            let threadData = await Threads.getData(id);
            const name = threadData?.threadInfo?.name || threadData?.threadInfo?.threadName || "Unknown";
            msg += `${index + 1}. ${bold(name)}\n   🆔 ${id}\n`;
        }
        return api.sendMessage(msg + `\n💬 Reply with number to approve (or "all")`, threadID, (error, info) => {
            if (!error) global.client.handleReply.push({ name: module.exports.config.name, messageID: info.messageID, author: event.senderID, type: "pending" });
        }, messageID);
    }

    if (args[0] === "help" || args[0] === "h") {
        const threadData = await Threads.getData(String(threadID));
        const prefix = threadData?.data?.PREFIX || global.config.PREFIX;
        return api.sendMessage(
            `╔══════════════════╗\n║  📖 ${bold('DUYET HELP')}    ║\n╚══════════════════╝\n\n` +
            `📋 ${prefix}duyet l/list → approved groups\n` +
            `🕐 ${prefix}duyet p/pending → pending groups\n` +
            `🗑️ ${prefix}duyet d/del [ID] → remove a group\n` +
            `✅ ${prefix}duyet [ID] → approve a group`,
            threadID, messageID
        );
    }

    if (args[0] === "del" || args[0] === "d") {
        idBox = args[1] || threadID;
        if (!approvedThreads.includes(idBox)) return api.sendMessage(`❎ Group not in approved list.`, threadID, messageID);
        approvedThreads = approvedThreads.filter(id => id !== idBox);
        fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
        await api.removeUserFromGroup(api.getCurrentUserID(), idBox);
        return api.sendMessage(`✅ ${bold('Removed')} group ${idBox}`, threadID, messageID);
    }

    if (isNaN(parseInt(idBox))) return api.sendMessage(`❎ Invalid group ID.`, threadID, messageID);
    if (approvedThreads.includes(idBox)) return api.sendMessage(`❎ Group ${idBox} is already approved.`, threadID, messageID);

    approvedThreads.push(idBox);
    pendingThreads = pendingThreads.filter(id => id !== idBox);
    fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
    fs.writeFileSync(dataPendingPath, JSON.stringify(pendingThreads, null, 2));
    api.sendMessage(`✅ ${bold('Approved!')}\n🎉 Your group has been approved!\n📝 Enjoy using ${global.config.BOTNAME}!`, idBox);
    return api.sendMessage(`✅ ${bold('Successfully approved')} group ${idBox}`, threadID, messageID);
};
