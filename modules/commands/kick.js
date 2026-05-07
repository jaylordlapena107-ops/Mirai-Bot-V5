module.exports.config = {
    name: "kick",
    version: "2.1.0",
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

    // ── PREVENT SELF KICK ────────────────────────────
    if (mentionID == senderID) {

        return api.sendMessage(
`╭───────────────⭓
│ ⚠️ ACTION BLOCKED
├───────────────⭔
│ You cannot kick
│ yourself.
╰───────────────⭓`,
            threadID
        );
    }

    // ── PROTECT OWNER ────────────────────────────────
    if (mentionID == PROTECTED_ID) {

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
        await Users.getNameUser(mentionID);

    // ── KICK USER ────────────────────────────────────
    try {

        await api.removeUserFromGroup(
            mentionID,
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
