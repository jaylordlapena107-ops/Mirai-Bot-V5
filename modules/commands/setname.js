const bold = require('../../utils/bold');

module.exports.config = {
    name: "setname",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "TrucCute mod by Niio-team",
    description: "Change nickname (GC Admin only)",
    commandCategory: "Group",
    usages: "[name / @mention / check / all / del / call] + [name]",
    cooldowns: 5
};

module.exports.run = async ({ api, event, args, Users }) => {

    let {
        threadID,
        messageReply,
        senderID,
        mentions,
        type,
        participantIDs
    } = event;

    // ── CHECK IF GC ADMIN ─────────────────────────────
    const threadInfo =
        await api.getThreadInfo(threadID);

    const isAdmin =
        threadInfo.adminIDs.some(
            admin => admin.id == senderID
        );

    if (!isAdmin) {
        return api.sendMessage(
            `⚠️ Only group admins can use this command.`,
            threadID
        );
    }

    switch (args[0]) {

        case 'call':
        case 'Call': {

            const dataNickName =
                threadInfo.nicknames;

            const objKeys =
                Object.keys(dataNickName);

            const notFoundIds =
                participantIDs.filter(
                    id => !objKeys.includes(id)
                );

            const mentionsList = [];

            let tag = '';

            for (let i = 0; i < notFoundIds.length; i++) {

                const id = notFoundIds[i];

                const name =
                    await Users.getNameUser(id);

                mentionsList.push({
                    tag: name,
                    id
                });

                tag += `${i + 1}. @${name}\n`;
            }

            return api.sendMessage({
                body:
                    `📣 Set Your Nickname!\n\n` +
                    `Please set your nickname so others can identify you.\n\n` +
                    `${tag}`,
                mentions: mentionsList
            }, threadID);
        }

        case 'del':
        case 'Del': {

            const dataNickName =
                threadInfo.nicknames;

            const notFoundIds =
                participantIDs.filter(
                    id => !Object.keys(dataNickName).includes(id)
                );

            await Promise.all(
                notFoundIds.map(async (id) => {

                    try {
                        api.removeUserFromGroup(
                            id,
                            threadID
                        );
                    } catch (e) {}
                })
            );

            return api.sendMessage(
                `✅ Removed members without nicknames.`,
                threadID
            );
        }

        case 'check':
        case 'Check': {

            const dataNickName =
                threadInfo.nicknames;

            const notFoundIds =
                participantIDs.filter(
                    id => !Object.keys(dataNickName).includes(id)
                );

            let msg =
                `📝 Members Without Nickname:\n\n`;

            let num = 1;

            await Promise.all(
                notFoundIds.map(async (id) => {

                    const name =
                        await Users.getNameUser(id);

                    msg += `${num++}. ${name}\n`;
                })
            );

            msg +=
                `\n💬 React to remove them from the group`;

            return api.sendMessage(
                msg,
                threadID,
                (error, info) => {

                    global.client.handleReaction.push({
                        name: module.exports.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        abc: notFoundIds
                    });
                }
            );
        }

        case 'help':

            return api.sendMessage(
                `📖 SETNAME HELP\n\n` +
                `1️⃣ setname [name]\n` +
                `→ change your nickname\n\n` +

                `2️⃣ setname @mention [name]\n` +
                `→ change member nickname\n\n` +

                `3️⃣ setname all [name]\n` +
                `→ change all nicknames\n\n` +

                `4️⃣ setname check\n` +
                `→ members without nickname\n\n` +

                `5️⃣ setname del\n` +
                `→ remove no nickname members\n\n` +

                `6️⃣ setname call\n` +
                `→ remind members`,
                threadID
            );

        case 'all':
        case 'All': {

            const name =
                event.body.split('all')[1] || '';

            for (const i of participantIDs) {

                try {
                    api.changeNickname(
                        name,
                        threadID,
                        i
                    );
                } catch (e) {}
            }

            return api.sendMessage(
                `✅ Changed all nicknames.`,
                threadID
            );
        }
    }

    // ── REPLY USER ────────────────────────────────────
    if (type == "message_reply") {

        let name2 =
            await Users.getNameUser(
                messageReply.senderID
            );

        const name =
            args.join(" ");

        api.changeNickname(
            `${name}`,
            threadID,
            messageReply.senderID
        );

        return api.sendMessage(
            `✅ Nickname Changed!\n\n` +
            `👤 ${name2}\n` +
            `📝 New: "${name || "original"}"`,
            threadID
        );
    }

    // ── MENTION USER ──────────────────────────────────
    else {

        const mention =
            Object.keys(mentions)[0];

        const name2 =
            await Users.getNameUser(
                mention || senderID
            );

        if (args.join().indexOf('@') !== -1) {

            const name =
                args.join(' ');

            api.changeNickname(
                `${name.replace(mentions[mention], "")}`,
                threadID,
                mention
            );

            return api.sendMessage(
                `✅ Nickname Changed!\n\n` +
                `👤 ${name2}\n` +
                `📝 New: "${name.replace(mentions[mention], "") || "original"}"`,
                threadID
            );
        }

        else {

            const name =
                args.join(" ");

            api.changeNickname(
                `${name}`,
                threadID,
                senderID
            );

            return api.sendMessage(
                `✅ Your nickname has been changed.\n\n` +
                `📝 New: "${name || "original"}"`,
                threadID
            );
        }
    }
};

module.exports.handleReaction = async function ({
    api,
    event,
    handleReaction
}) {

    if (event.userID != handleReaction.author)
        return;

    if (
        Array.isArray(handleReaction.abc)
        && handleReaction.abc.length > 0
    ) {

        let errorOccurred = false;

        for (const userID of handleReaction.abc) {

            try {

                await api.removeUserFromGroup(
                    userID,
                    event.threadID
                );

            } catch (e) {

                errorOccurred = true;
            }
        }

        api.sendMessage(
            errorOccurred
                ? `⚠️ Some members could not be removed.`
                : `✅ Removed ${handleReaction.abc.length} member(s) without nicknames.`,
            event.threadID
        );
    }
};
