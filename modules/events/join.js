const bold = require('../../utils/bold');

module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe"],
    version: "1.0.4",
    credits: "Mirai Team",
    description: "Notify when bot or user joins a group",
};

module.exports.run = async function({ api, event, Users }) {
    const fs = require('fs-extra');
    const path = require('path');
    const { threadID } = event;

    if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
        api.changeNickname(`[ ${global.config.PREFIX} ] • ${global.config.BOTNAME || "Mirai Bot"}`, threadID, api.getCurrentUserID());
        return api.sendMessage(
            `👋 ${bold('Hello Everyone!')}\n\n` +
            `🤖 I'm ${bold(global.config.BOTNAME || "Mirai Bot")}!\n` +
            `⌨️ Prefix: ${bold(global.config.PREFIX)}\n` +
            `📖 Type ${global.config.PREFIX}help to see all commands!\n\n` +
            `👑 ${bold('Admin:')} Manuelson Yasis\n` +
            `🔗 fb.com/manuelson.yasis`,
            threadID
        );
    } else {
        try {
            const { threadName, participantIDs } = await api.getThreadInfo(threadID);
            const threadData = global.data.threadData.get(parseInt(threadID)) || {};
            const cachePath = path.join(__dirname, "cache", "joinGif");
            const pathGif = path.join(cachePath, `${threadID}.gif`);

            var mentions = [], nameArray = [], memLength = [], i = 0;

            for (const p of event.logMessageData.addedParticipants) {
                const userName = p.fullName;
                const userFbId = p.userFbId;
                nameArray.push(userName);
                mentions.push({ tag: userName, id: userFbId });
                memLength.push(participantIDs.length - i++);

                if (!global.data.allUserID.includes(String(userFbId))) {
                    await Users.createData(userFbId, { name: userName, data: {} });
                    global.data.allUserID.push(String(userFbId));
                }
            }

            memLength.sort((a, b) => a - b);

            var msg = threadData.customJoin ||
                `👋 Welcome {name}!\n\n🎉 Welcome to ${bold('{threadName}')}\n🔢 You are member #{memberCount}\n\n📖 Type ${global.config.PREFIX}help for commands!`;

            msg = msg
                .replace(/\{name}/g, nameArray.join(', '))
                .replace(/\{type}/g, memLength.length > 1 ? 'They are' : 'You are')
                .replace(/\{memberCount}/g, memLength.join(', '))
                .replace(/\{threadName}/g, threadName);

            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

            let formPush = fs.existsSync(pathGif)
                ? { body: msg, attachment: fs.createReadStream(pathGif), mentions }
                : { body: msg, mentions };

            return api.sendMessage(formPush, threadID);
        } catch (e) {
            console.log(e);
        }
    }
};
