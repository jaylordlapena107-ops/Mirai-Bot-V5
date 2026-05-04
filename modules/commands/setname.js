const bold = require('../../utils/bold');

module.exports.config = {
    name: "setname",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "TrucCute mod by Niio-team",
    description: "Change your nickname or another member's nickname",
    commandCategory: "Group",
    usages: "[name / @mention / check / all / del / call] + [name]",
    cooldowns: 5
};

module.exports.run = async ({ api, event, args, Users }) => {
    let { threadID, messageReply, senderID, mentions, type, participantIDs } = event;

    switch (args[0]) {
        case 'call':
        case 'Call': {
            const dataNickName = (await api.getThreadInfo(threadID)).nicknames;
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            const mentionsList = [];
            let tag = '';
            for (let i = 0; i < notFoundIds.length; i++) {
                const id = notFoundIds[i];
                const name = await Users.getNameUser(id);
                mentionsList.push({ tag: name, id });
                tag += `${i + 1}. @${name}\n`;
            }
            return api.sendMessage({
                body: `📣 ${bold('Set Your Nickname!')}\nPlease set your nickname so others can identify you! 😊\n\n${tag}`,
                mentions: mentionsList
            }, threadID);
        }
        case 'del':
        case 'Del': {
            const threadInfo = await api.getThreadInfo(threadID);
            if (!threadInfo.adminIDs.some(admin => admin.id === senderID))
                return api.sendMessage(`⚠️ ${bold('Admins only!')}`, threadID);
            const dataNickName = threadInfo.nicknames;
            const notFoundIds = participantIDs.filter(id => !Object.keys(dataNickName).includes(id));
            await Promise.all(notFoundIds.map(async (id) => {
                try { api.removeUserFromGroup(id, threadID); } catch (e) {}
            }));
            return api.sendMessage(`✅ ${bold('Done!')} Removed members without nicknames.`, threadID);
        }
        case 'check':
        case 'Check': {
            const dataNickName = (await api.getThreadInfo(threadID)).nicknames;
            const notFoundIds = participantIDs.filter(id => !Object.keys(dataNickName).includes(id));
            var msg = `📝 ${bold('Members Without Nickname:')}\n\n`, num = 1;
            await Promise.all(notFoundIds.map(async (id) => {
                const name = await Users.getNameUser(id);
                msg += `${num++}. ${name}\n`;
            }));
            msg += `\n💬 React to kick them from the group`;
            return api.sendMessage(msg, threadID, (error, info) => {
                global.client.handleReaction.push({
                    name: module.exports.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    abc: notFoundIds
                });
            });
        }
        case 'help':
            return api.sendMessage(
                `╔══════════════════╗\n║  📖 ${bold('SETNAME HELP')} ║\n╚══════════════════╝\n\n` +
                `1️⃣ setname [name] → your nickname\n` +
                `2️⃣ setname @mention [name] → member nickname\n` +
                `3️⃣ setname all [name] → all members\n` +
                `4️⃣ setname check → members without nickname\n` +
                `5️⃣ setname del → remove no-nickname (admin)\n` +
                `6️⃣ setname call → remind to set nicknames`,
                threadID
            );
        case 'all':
        case 'All': {
            const name = event.body.split('all')[1] || '';
            for (const i of participantIDs) {
                try { api.changeNickname(name, threadID, i); } catch (e) {}
            }
            return api.sendMessage(`✅ ${bold('Done!')} Changed all nicknames.`, threadID);
        }
    }

    if (type == "message_reply") {
        let name2 = await Users.getNameUser(messageReply.senderID);
        const name = args.join(" ");
        api.changeNickname(`${name}`, threadID, messageReply.senderID);
        return api.sendMessage(
            `✅ ${bold('Nickname Changed!')}\n👤 ${name2}\n📝 New: "${name || "original"}"`,
            threadID
        );
    } else {
        const mention = Object.keys(mentions)[0];
        const name2 = await Users.getNameUser(mention || senderID);
        if (args.join().indexOf('@') !== -1) {
            const name = args.join(' ');
            api.changeNickname(`${name.replace(mentions[mention], "")}`, threadID, mention);
            return api.sendMessage(
                `✅ ${bold('Nickname Changed!')}\n👤 ${name2}\n📝 New: "${name.replace(mentions[mention], "") || "original"}"`,
                threadID
            );
        } else {
            const name = args.join(" ");
            api.changeNickname(`${name}`, threadID, senderID);
            return api.sendMessage(
                `✅ ${bold('Your Nickname Changed!')}\n📝 New: "${name || "original"}"`,
                threadID
            );
        }
    }
};

module.exports.handleReaction = async function ({ api, event, handleReaction }) {
    if (event.userID != handleReaction.author) return;
    if (Array.isArray(handleReaction.abc) && handleReaction.abc.length > 0) {
        let errorOccurred = false;
        for (const userID of handleReaction.abc) {
            try { await api.removeUserFromGroup(userID, event.threadID); }
            catch (e) { errorOccurred = true; }
        }
        api.sendMessage(
            errorOccurred
                ? `⚠️ Some members could not be removed.`
                : `✅ ${bold('Done!')} Removed ${handleReaction.abc.length} member(s) without nicknames.`,
            event.threadID
        );
    }
};
