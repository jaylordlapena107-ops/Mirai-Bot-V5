module.exports.config = {
  name: "bye",
  version: "2.0.0",
  hasPermission: 1,
  credits: "ChatGPT",
  description: "Kick all members safely (with confirmation)",
  commandCategory: "admin",
  usages: "/bye",
  cooldowns: 10
};

const confirmList = new Map();

module.exports.run = async function({ api, event }) {
  const { threadID, senderID } = event;

  confirmList.set(threadID, senderID);

  return api.sendMessage(
    "⚠️ This will remove ALL non-admin members.\nType CONFIRM within 30 seconds to proceed.",
    threadID
  );
};

module.exports.handleReply = async function({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!confirmList.has(threadID)) return;
  if (confirmList.get(threadID) != senderID) return;

  if (body.toUpperCase() !== "CONFIRM") return;

  confirmList.delete(threadID);

  const threadInfo = await api.getThreadInfo(threadID);
  const botID = api.getCurrentUserID();

  api.sendMessage("🚀 Starting cleanup... Please wait.", threadID);

  for (let user of threadInfo.participantIDs) {
    if (user == botID) continue;

    const isAdmin = threadInfo.adminIDs.some(admin => admin.id == user);
    if (isAdmin) continue;

    await new Promise(resolve => setTimeout(resolve, 1200)); // delay para safe
    api.removeUserFromGroup(user, threadID);
  }

  api.sendMessage("✅ Cleanup done. See you on Discord!", threadID);
};
