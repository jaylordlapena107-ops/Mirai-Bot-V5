module.exports.config = {
    name: "leaveNoti",
    eventType: ["log:unsubscribe"],
    version: "3.0.0",
    credits: "Ranz | Edited",
    description: "Notify when a user leaves the group"
};

module.exports.run = async function ({
    api,
    event,
    Users
}) {

    try {

        const { threadID } = event;

        const leftID =
            event.logMessageData.leftParticipantFbId;

        // Ignore bot leave
        if (leftID == api.getCurrentUserID())
            return;

        // Prevent duplicate message
        if (!global.leaveCooldown)
            global.leaveCooldown = new Set();

        const cooldownKey =
            `${threadID}_${leftID}`;

        if (
            global.leaveCooldown.has(cooldownKey)
        ) return;

        global.leaveCooldown.add(cooldownKey);

        setTimeout(() => {
            global.leaveCooldown.delete(cooldownKey);
        }, 3000);

        const moment =
            require("moment-timezone");

        const time =
            moment
            .tz("Asia/Manila")
            .format("hh:mm A • MMM D YYYY");

        const name =
            global.data.userName.get(leftID)
            || await Users.getNameUser(leftID);

        const authorName =
            event.author == leftID
            ? null
            : await Users.getNameUser(event.author);

        const status =
            event.author == leftID
            ? "Left the group"
            : `Removed by ${authorName}`;

        const msg =
`╭───────────────⭓
│ 👋 MEMBER LEFT
├───────────────⭔
│ 👤 Name: ${name}
│ 📌 Status: ${status}
│ 🕒 Time: ${time}
╰───────────────⭓`;

        return api.sendMessage(
            msg,
            threadID
        );

    } catch (e) {

        console.log(
            "[leaveNoti]",
            e
        );

    }
};
