module.exports.config = {
    name: "kick",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "ChatGPT",
    description: "Kick mentioned member",
    commandCategory: "Group",
    usages: "/kick @mention",
    cooldowns: 5
};

// ── PROTECTED ID ─────────────────────────────────────
const PROTECTED_ID = "61559999326713";

module.exports.run = async function ({
    api,
    event,
    Users
}) {

    const {
        threadID,
        senderID,
        mentions
    } = event;

    // ── GET THREAD INFO ───────────────────────────────
    const threadInfo =
        await api.getThreadInfo(threadID);

    // ── CHECK IF USER IS GC ADMIN ────────────────────
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

    // ── CHECK MENTION ────────────────────────────────
    const mentionID =
        Object.keys(mentions)[0];

    if (!mentionID) {

        return api.sendMessage(
            `⚠️ Please mention a user to kick.`,
            threadID
        );
    }

    // ── PROTECT OWNER ────────────────────────────────
    if (mentionID == PROTECTED_ID) {

        return api.sendMessage(
            `⚠️ You cannot remove the bot owner.`,
            threadID
        );
    }

    // ── GET USER NAME ────────────────────────────────
    const userName =
        await Users.getNameUser(mentionID);

    // ── KICK USER ────────────────────────────────────
    try {

        await api.removeUserFromGroup(
            mentionID,
            threadID
        );

        return api.sendMessage(
            `✅ ${userName} has been removed from the group.`,
            threadID
        );

    } catch (e) {

        console.log(e);

        return api.sendMessage(
            `❌ Failed to remove user.\nMake sure the bot is admin.`,
            threadID
        );
    }
};
