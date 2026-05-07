const {
  setData,
  getData
} = require("../../database.js");

module.exports.config = {
  name: "spamkick",
  version: "2.0.0",
  hasPermssion: 1,
  credits: "Jaylord La Peña + ChatGPT",
  description:
    "Auto kick users who spam messages",
  commandCategory:
    "moderation",

  usages: `
📌 /spamkick on <limit>
📌 /spamkick off
📌 /spamkick status
`,

  cooldowns: 5,

  // IMPORTANT
  handleEvent: true
};

// ── MEMORY CACHE ────────────────────
let spamCache = {};

// ── PROTECTED USERS ─────────────────
const PROTECTED_UIDS = [
  "61559999326713",
  "61554885397487"
];

// ── OWNER ───────────────────────────
const OWNER_UID =
  "61559999326713";

// ── COMMAND ─────────────────────────
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

  // ── OWNER ONLY ───────────────────
  if (
    senderID !== OWNER_UID
  ) {

    return api.sendMessage(

      "❌ Only owner can use this command.",

      threadID,
      messageID
    );
  }

  // ── NO ARGS ──────────────────────
  if (!args.length) {

    return api.sendMessage(

      module.exports.config.usages,

      threadID,
      messageID
    );
  }

  const sub =
    args[0].toLowerCase();

  // ── ENABLE ───────────────────────
  if (sub === "on") {

    const limit =
      parseInt(args[1]) || 10;

    await setData(
      `spamkick/${threadID}`,
      {
        enabled: true,
        limit
      }
    );

    return api.sendMessage(

`╭───────────────⭓
│ ✅ SPAMKICK ENABLED
├───────────────⭔
│ Limit:
│ ${limit} messages
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── DISABLE ──────────────────────
  if (sub === "off") {

    await setData(
      `spamkick/${threadID}`,
      {
        enabled: false
      }
    );

    return api.sendMessage(

`╭───────────────⭓
│ ❌ SPAMKICK DISABLED
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── STATUS ───────────────────────
  if (sub === "status") {

    const data =
      await getData(
        `spamkick/${threadID}`
      ) || {
        enabled: false,
        limit: 10
      };

    return api.sendMessage(

`╭───────────────⭓
│ 📊 SPAMKICK STATUS
├───────────────⭔
│ Enabled:
│ ${
  data.enabled
    ? "✅ YES"
    : "❌ NO"
}
│
│ Limit:
│ ${data.limit || 10}
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── INVALID ──────────────────────
  return api.sendMessage(

    module.exports.config.usages,

    threadID,
    messageID
  );
};

// ── EVENT LISTENER ─────────────────
module.exports.handleEvent =
async function ({
  api,
  event
}) {

  try {

    const {
      threadID,
      senderID,
      body
    } = event;

    // ── DEBUG ──────────────────────
    console.log(
      "[SPAM EVENT]",
      senderID,
      body
    );

    if (
      !threadID ||
      !senderID ||
      !body
    ) return;

    // ── SKIP PROTECTED ─────────────
    if (
      PROTECTED_UIDS.includes(
        senderID
      )
    ) return;

    // ── GET CONFIG ─────────────────
    const config =
      await getData(
        `spamkick/${threadID}`
      );

    if (
      !config ||
      !config.enabled
    ) return;

    // ── INIT THREAD ────────────────
    if (
      !spamCache[threadID]
    ) {

      spamCache[
        threadID
      ] = {};
    }

    // ── INIT USER ──────────────────
    if (
      !spamCache[
        threadID
      ][senderID]
    ) {

      spamCache[
        threadID
      ][senderID] = {

        count: 0,

        lastMsg:
          Date.now()
      };
    }

    const userData =
      spamCache[
        threadID
      ][senderID];

    const now =
      Date.now();

    // ── RESET AFTER 5s ─────────────
    if (
      now -
      userData.lastMsg >
      5000
    ) {

      userData.count = 0;
    }

    // ── ADD COUNT ──────────────────
    userData.count++;

    userData.lastMsg =
      now;

    console.log(
      `[SPAM COUNT] ${senderID}:`,
      userData.count
    );

    // ── WARNING ────────────────────
    if (
      userData.count ===
      config.limit - 2
    ) {

      api.sendMessage(

`⚠️ Warning!

Stop spamming or
you will be kicked.`,

        threadID
      );
    }

    // ── AUTO KICK ──────────────────
    if (
      userData.count >=
      config.limit
    ) {

      try {

        await api.removeUserFromGroup(
          senderID,
          threadID
        );

        api.sendMessage(

`🚨 User kicked for spamming.`,

          threadID
        );

      } catch (e) {

        console.log(
          "KICK ERROR:",
          e
        );

        api.sendMessage(

`❌ Failed to kick user.
Make sure bot is admin.`,

          threadID
        );
      }

      // RESET
      userData.count = 0;
    }

  } catch (e) {

    console.log(
      "SPAMKICK ERROR:",
      e
    );
  }
};
