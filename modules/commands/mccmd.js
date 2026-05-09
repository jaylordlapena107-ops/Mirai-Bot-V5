const axios = require("axios");

module.exports.config = {
  name: "mccmd",
  version: "5.0.0",
  credits: "ChatGPT",
  description: "Send Minecraft commands from Facebook",
  commandCategory: "minecraft",
  usages: "/mccmd <command>",
  cooldowns: 3
};

const FIREBASE_URL =
  "https://mybot-d79df-default-rtdb.asia-southeast1.firebasedatabase.app";

// OWNER UID
const BOT_OWNER = [
  "61581773373775"
];

// allowed commands for gc admins
const ADMIN_COMMANDS = [
  "/jail",
  "/cmi jail",
  "/kick",
  "/ban"
];

module.exports.run = async function ({
  api,
  event,
  args
}) {

  const {
    threadID,
    senderID,
    messageID
  } = event;

  // no command
  if (!args[0]) {

    return api.sendMessage(

`╔══════════════╗
║ 📌 MCCMD USAGE
╚══════════════╝

/mccmd <command>

Example:
• /mccmd /kick Steve
• /mccmd /jail Steve`,

      threadID,
      messageID
    );
  }

  // full command
  const fullCmd =
    args.join(" ").trim();

  // get gc info
  let isAdmin = false;

  try {

    const info =
      await api.getThreadInfo(
        threadID
      );

    isAdmin =
      info.adminIDs.some(
        a => a.id == senderID
      );

  } catch (e) {

    return api.sendMessage(
      "❌ Failed to get GC info.",
      threadID,
      messageID
    );
  }

  // owner check
  const isOwner =
    BOT_OWNER.includes(
      senderID
    );

  // not owner
  if (!isOwner) {

    // must be gc admin
    if (!isAdmin) {

      return api.sendMessage(
        "❌ Only GC admins can use this command.",
        threadID,
        messageID
      );
    }

    // check allowed command
    const lower =
      fullCmd.toLowerCase();

    const allowed =
      ADMIN_COMMANDS.some(
        cmd =>
          lower.startsWith(cmd)
      );

    if (!allowed) {

      return api.sendMessage(

`╔══════════════╗
║ ❌ NOT ALLOWED
╚══════════════╝

GC Admins can only use:

• /jail
• /cmi jail
• /kick
• /ban`,

        threadID,
        messageID
      );
    }
  }

  try {

    // send command
    await axios.post(
      `${FIREBASE_URL}/command.json`,
      {
        cmd: fullCmd,
        executed: "false",
        deviceId: threadID,
        name: senderID,
        uid: senderID,
        time: Date.now()
      }
    );

    // react only
    api.setMessageReaction(
      "⚡",
      messageID,
      () => {},
      true
    );

  } catch (e) {

    console.log(
      "MC CMD ERROR:",
      e.message
    );

    api.setMessageReaction(
      "❌",
      messageID,
      () => {},
      true
    );
  }
};
