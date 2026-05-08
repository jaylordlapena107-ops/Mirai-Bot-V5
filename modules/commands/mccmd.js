const axios = require("axios");

module.exports.config = {
  name: "mccmd",
  version: "2.0.0",
  credits: "ChatGPT",
  description:
    "Send Minecraft commands from Facebook",
  commandCategory: "minecraft",
  usages:
    "/mccmd <command>",
  cooldowns: 3
};

const FIREBASE_URL =
  "https://mybot-d79df-default-rtdb.asia-southeast1.firebasedatabase.app";

// OWNER UID
const BOT_OWNER = [
  "61559999326713"
];

// allowed for gc admins
const ADMIN_COMMANDS = [
  "/jail",
  "/cmi jail",
  "/kick",
  "/ban"
];

module.exports.run =
async function ({
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

`📌 Usage:
 /mccmd <command>

Example:
 /mccmd /kick Steve
 /mccmd /jail Steve`,

      threadID,
      messageID
    );
  }

  // full command
  const fullCmd =
    args.join(" ").trim();

  // check gc admin
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

  // if not owner
  if (!isOwner) {

    // must be admin
    if (!isAdmin) {

      return api.sendMessage(
        "❌ Only GC admins can use this.",
        threadID,
        messageID
      );
    }

    // allowed cmds only
    const lower =
      fullCmd.toLowerCase();

    const allowed =
      ADMIN_COMMANDS.some(
        cmd =>
          lower.startsWith(cmd)
      );

    if (!allowed) {

      return api.sendMessage(

`❌ GC Admins can only use:

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

    // unique key
    const commandID =
      "cmd_" + Date.now();

    // firebase path
    const path =
      `${FIREBASE_URL}/command/${commandID}.json`;

    // send command
    await axios.put(
      path,
      {
        cmd: fullCmd,
        deviceId: threadID,
        executed: "false",
        name: senderID,
        uid: senderID
      }
    );

    // react waiting
    api.setMessageReaction(
      "⏳",
      messageID,
      () => {},
      true
    );

    // wait for execution
    const interval =
      setInterval(
        async () => {

          try {

            const res =
              await axios.get(path);

            const data =
              res.data;

            if (!data)
              return;

            // executed?
            if (
              data.executed ===
              "true"
            ) {

              clearInterval(
                interval
              );

              // react success
              api.setMessageReaction(
                "✅",
                messageID,
                () => {},
                true
              );

              api.sendMessage(

`╔══════════════╗
║ ✅ EXECUTED
╚══════════════╝

🖥️ Command:
${fullCmd}

⚡ Successfully executed
on Minecraft server.`,

                threadID
              );
            }

          } catch (e) {

            clearInterval(
              interval
            );

            console.log(
              "CHECK ERROR:",
              e.message
            );
          }

        },

        1000
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

    api.sendMessage(
      "❌ Failed to send command.",
      threadID,
      messageID
    );
  }
};
