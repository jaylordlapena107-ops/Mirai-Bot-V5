module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe"],
    version: "1.0.3",
    credits: "Mirai Team",
    description: "Notify when bot or user joins a group",
    dependencies: {
        "fs-extra": ""
    }
};

module.exports.run = async function({ api, event, Users }) {
    const fs = require('fs-extra');
    const path = require('path');
    const { threadID } = event;

    if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
        api.changeNickname(`[ ${global.config.PREFIX} ] • ${global.config.BOTNAME || "Mirai Bot"}`, threadID, api.getCurrentUserID());
        return api.sendMessage(`Hello everyone! I'm ${global.config.BOTNAME || "Mirai Bot"} 👋`, threadID);
    } else {
        try {
            const { threadName, participantIDs } = await api.getThreadInfo(threadID);
            const threadData = global.data.threadData.get(parseInt(threadID)) || {};
            const cachePath = path.join(__dirname, "cache", "joinGif");
            const pathGif = path.join(cachePath, `${threadID}.gif`);

            var mentions = [], nameArray = [], memLength = [], i = 0;

            for (const id in event.logMessageData.addedParticipants) {
                const userName = event.logMessageData.addedParticipants[id].fullName;
                const userFbId = event.logMessageData.addedParticipants[id].userFbId;
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
                "👋 Welcome {name}!\nWelcome to {threadName}.\n{type} is member #{memberCount} of this group 🥳";

            msg = msg
                .replace(/\{name}/g, nameArray.join(', '))
                .replace(/\{type}/g, memLength.length > 1 ? 'they' : 'you')
                .replace(/\{memberCount}/g, memLength.join(', '))
                .replace(/\{soThanhVien}/g, memLength.join(', '))
                .replace(/\{threadName}/g, threadName);

            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

            let formPush;
            if (fs.existsSync(pathGif)) {
                formPush = { body: msg, attachment: fs.createReadStream(pathGif), mentions };
            } else {
                formPush = { body: msg, mentions };
            }

            return api.sendMessage(formPush, threadID);
        } catch (e) {
            return console.log(e);
        }
    }
};
