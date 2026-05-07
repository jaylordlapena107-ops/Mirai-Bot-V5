module.exports.config = {
    name: "kick",
    version: "2.3.0",
    hasPermssion: 0,
    credits: "ChatGPT",
    description: "Kick mentioned member",
    commandCategory: "Group",
    usages: "/kick @mention",
    cooldowns: 5
};

// ── PROTECTED OWNER ID ───────────────────────────────
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

    // ── BOT ID ───────────────────────────────────────
    const botID =
        api.getCurrentUserID();

    // ── GET THREAD INFO ──────────────────────────────
    const threadInfo =
        await api.getThreadInfo(threadID);

    // ── CHECK ADMIN ──────────────────────────────────
    const isAdmin =
        threadInfo.adminIDs.some(
            admin => admin.id == senderID
        );

    if (!isAdmin) {

        return api.sendMessage(
`╭───────────────⭓
│ ⚠️ ACCESS DENIED
├───────────────⭔
│ Only group admins
│ can use this command.
╰───────────────⭓`,
            threadID
        );
    }

    // ── CHECK MENTION ────────────────────────────────
    const mentionID =
        Object.keys(mentions)[0];

    if (!mentionID) {

        return api.sendMessage(
`╭───────────────⭓
│ ⚠️ INVALID USAGE
├───────────────⭔
│ Please mention
│ a user to kick.
╰───────────────⭓`,
            threadID
        );
    }

    const targetID =
        String(mentionID);

    // ── PREVENT KICKING BOT ──────────────────────────
    if (targetID === String(botID)) {

        return api.sendMessage(
`╭───────────────⭓
│ 🤖 ACTION BLOCKED
├───────────────⭔
│ You cannot kick
│ the bot.
╰───────────────⭓`,
            threadID
        );
    }

    // ── PROTECT OWNER ────────────────────────────────
    if (targetID === PROTECTED_ID) {

        return api.sendMessage(
`╭───────────────⭓
│ 👑 PROTECTED USER
├───────────────⭔
│ You cannot remove
│ the bot owner.
╰───────────────⭓`,
            threadID
        );
    }

    // ── GET USER NAME ────────────────────────────────
    const userName =
        await Users.getNameUser(targetID);

    // ── REMOVE USER ──────────────────────────────────
    try {

        await api.removeUserFromGroup(
            targetID,
            threadID
        );

        return api.sendMessage(
`╭───────────────⭓
│ ✅ MEMBER REMOVED
├───────────────⭔
│ 👤 ${userName}
│ has been removed
│ from the group.
╰───────────────⭓`,
            threadID
        );

    } catch (e) {

        console.log(e);

        return api.sendMessage(
`╭───────────────⭓
│ ❌ REMOVE FAILED
├───────────────⭔
│ Make sure the bot
│ is group admin.
╰───────────────⭓`,
            threadID
        );
    }
};
