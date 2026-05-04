module.exports.config = {
    name: "setname",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "TrucCute mod by Niio-team (Cthinh)",
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
            const message = {
                body: `📣 Please set your nickname so others can identify you easily!\n\n${tag}`,
                mentions: mentionsList
            };
            api.sendMessage(message, threadID);
            return;
        }

        case 'del':
        case 'Del': {
            const threadInfo = await api.getThreadInfo(threadID);
            if (!threadInfo.adminIDs.some(admin => admin.id === senderID)) {
                return api.sendMessage(`⚠️ Only admins can use this.`, threadID);
            }
            const dataNickName = threadInfo.nicknames;
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            await Promise.all(notFoundIds.map(async (id) => {
                try { api.removeUserFromGroup(id, threadID); } catch (e) { console.log(e); }
            }));
            return api.sendMessage(`✅ Removed members without nicknames.`, threadID);
        }

        case 'check':
        case 'Check': {
            const dataNickName = (await api.getThreadInfo(threadID)).nicknames;
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            var msg = '📝 Members without nickname:\n', num = 1;
            await Promise.all(notFoundIds.map(async (id) => {
                const name = await Users.getNameUser(id);
                msg += `\n${num++}. ${name}`;
            }));
            msg += `\n\n📌 React to this message to kick them from the group`;
            return api.sendMessage(msg, threadID, (error, info) => {
                global.client.handleReaction.push({
                    name: module.exports.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    abc: notFoundIds
                });
            });
        }

        case 'help':
            return api.sendMessage(
                `1. "setname [name]" → Change your nickname\n` +
                `2. "setname @mention [name]" → Change another member's nickname\n` +
                `3. "setname all [name]" → Change all members' nicknames\n` +
                `4. "setname check" → List members without nicknames\n` +
                `5. "setname del" → Remove members without nicknames (admin only)\n` +
                `6. "setname call" → Remind members to set nicknames`,
                threadID
            );

        case 'all':
        case 'All': {
            try {
                const name = event.body.split('all')[1] || '';
                for (const i of participantIDs) {
                    try { api.changeNickname(name, threadID, i); } catch (e) { console.log(e); }
                }
                return api.sendMessage(`✅ Changed nickname for all members.`, threadID);
            } catch (e) {
                return console.log(e);
            }
        }
    }

    const delayUnsend = 60;
    if (type == "message_reply") {
        let name2 = await Users.getNameUser(messageReply.senderID);
        const name = args.join(" ");
        api.changeNickname(`${name}`, threadID, messageReply.senderID);
        return api.sendMessage(`✅ Changed ${name2}'s nickname to "${name || "original"}"`, threadID, (err, info) =>
            setTimeout(() => { api.unsendMessage(info.messageID); }, delayUnsend * 1000)
        );
    } else {
        const mention = Object.keys(mentions)[0];
        const name2 = await Users.getNameUser(mention || senderID);
        if (args.join().indexOf('@') !== -1) {
            const name = args.join(' ');
            api.changeNickname(`${name.replace(mentions[mention], "")}`, threadID, mention);
            return api.sendMessage(`✅ Changed ${name2}'s nickname to "${name.replace(mentions[mention], "") || "original"}"`, threadID, (err, info) =>
                setTimeout(() => { api.unsendMessage(info.messageID); }, delayUnsend * 1000)
            );
        } else {
            const name = args.join(" ");
            api.changeNickname(`${name}`, threadID, senderID);
            return api.sendMessage(`✅ Changed your nickname to "${name || "original"}"`, threadID, (err, info) =>
                setTimeout(() => { api.unsendMessage(info.messageID); }, delayUnsend * 1000)
            );
        }
    }
};

module.exports.handleReaction = async function ({ api, event, handleReaction }) {
    if (event.userID != handleReaction.author) return;
    if (Array.isArray(handleReaction.abc) && handleReaction.abc.length > 0) {
        let errorMessage = '';
        let successMessage = `✅ Removed ${handleReaction.abc.length} member(s) without nicknames.`;
        let errorOccurred = false;
        for (let i = 0; i < handleReaction.abc.length; i++) {
            const userID = handleReaction.abc[i];
            try {
                await api.removeUserFromGroup(userID, event.threadID);
            } catch (error) {
                errorOccurred = true;
                errorMessage += `⚠️ Error removing ${userID} from group\n`;
            }
        }
        api.sendMessage(errorOccurred ? errorMessage : successMessage, event.threadID);
    } else {
        api.sendMessage(`No one to remove!`, event.threadID);
    }
};
