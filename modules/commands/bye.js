module.exports.config = {
  name: "bye",
  version: "4.0.0",
  hasPermission: 1,
  credits: "ChatGPT",
  description: "Auto kick all members instantly",
  commandCategory: "admin",
  usages: "/bye",
  cooldowns: 10
};

// 👉 hindi dapat ma-kick
const EXCLUDED_IDS = ["61581773373775"];

module.exports.run = async function({ api, event }) {
  const { threadID } = event;

  const threadInfo = await api.getThreadInfo(threadID);
  const botID = api.getCurrentUserID();

  api.sendMessage("🚀 Cleaning group... Lipat na sa Discord!", threadID);

  for (let user of threadInfo.participantIDs) {

    // ❌ skip bot
    if (user == botID) continue;

    // ❌ skip specific ID
    if (EXCLUDED_IDS.includes(user)) continue;

    // ❌ skip admins
    const isAdmin = threadInfo.adminIDs.some(admin => admin.id == user);
    if (isAdmin) continue;

    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // delay para iwas rate limit
      api.removeUserFromGroup(user, threadID);
    } catch (e) {
      console.log("Kick failed:", user);
    }
  }

  api.sendMessage("✅ Done. Tara na sa Discord!", threadID);
};
