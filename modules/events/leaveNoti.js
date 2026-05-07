module.exports.config = {
    name: "leaveNoti",
    eventType: ["log:unsubscribe"],
    version: "2.0.0",
    credits: "Ranz | Edited by ChatGPT",
    description: "Notify when a user leaves the group",
};

module.exports.onLoad = function () {
    const { existsSync, mkdirSync } = require("fs-extra");
    const { join } = require("path");

    const p1 = join(__dirname, "cache", "leaveGif");
    const p2 = join(__dirname, "cache", "leaveGif", "randomgif");

    if (!existsSync(p1)) mkdirSync(p1, { recursive: true });
    if (!existsSync(p2)) mkdirSync(p2, { recursive: true });
};

module.exports.run = async function ({ api, event, Users, Threads }) {

    try {

        const { threadID } = event;

        const iduser =
            event.logMessageData.leftParticipantFbId;

        // ignore if bot leaves
        if (iduser == api.getCurrentUserID()) return;

        const moment =
            require("moment-timezone");

        const time =
            moment
            .tz("Asia/Manila")
            .format("hh:mm A | MMM D YYYY");

        const threadRecord =
            await Threads.getData(threadID);

        const data =
            global.data.threadData.get(parseInt(threadID))
            || (threadRecord ? threadRecord.data : {});

        const userData =
            await Users.getData(event.author);

        const nameAuthor =
            userData?.name || "Unknown";

        const name =
            global.data.userName.get(iduser)
            || await Users.getNameUser(iduser);

        const type =
            (event.author == iduser)
            ? "left the group."
            : `was removed by ${nameAuthor}.`;

        let msg =
            data?.customLeave ||

`━━━━━━━━━━━━━━━
👋 Goodbye ${name}

${type}

🕒 ${time}

We hope to see you again.
━━━━━━━━━━━━━━━`;

        msg = msg
            .replace(/\{name}/g, name)
            .replace(/\{type}/g, type)
            .replace(/\{time}/g, time)
            .replace(/\{author}/g, nameAuthor)
            .replace(/\{iduser}/g, iduser);

        return api.sendMessage(
            msg,
            threadID
        );

    } catch (e) {

        console.log(
            "[LeaveNoti Error]",
            e
        );
    }
};
