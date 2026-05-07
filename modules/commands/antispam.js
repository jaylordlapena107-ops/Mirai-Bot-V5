const {
  getData,
  setData
} = require("../../database.js");

module.exports.config = {
  name: "antispam",
  version: "4.0.0",
  credits: "ChatGPT",
  description:
    "Anti spam system with warning + auto kick",
  usages:
    "/antispam on | off",
  commandCategory:
    "moderation",
  cooldowns: 3,

  // IMPORTANT
  handleEvent: true
};

// ── SPAM TRACKER ─────────────────────
const spamTracker = {};

// ── OWNER ID ─────────────────────────
const ownerID =
  "61559999326713";

// ── COMMAND ──────────────────────────
module.exports.run =
async function ({
  api,
  event,
  args
}) {

  const {
    threadID,
    messageID,
    senderID
  } = event;

  const sub =
    (args[0] || "")
    .toLowerCase();

  // ── OWNER BYPASS ──────────────────
  if (senderID != ownerID) {

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

      console.log(e);

      return api.sendMessage(

`╭───────────────⭓
│ ❌ FAILED
├───────────────⭔
│ Cannot get
│ group info.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // ── ADMIN CHECK ─────────────────
    if (!isAdmin) {

      return api.sendMessage(

`╭───────────────⭓
│ ❌ ACCESS DENIED
├───────────────⭔
│ Only GC admins
│ can use this.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }
  }

  // ── INVALID USAGE ─────────────────
  if (
    sub !== "on" &&
    sub !== "off"
  ) {

    return api.sendMessage(

`╭───────────────⭓
│ 🛡️ ANTISPAM
├───────────────⭔
│ Usage:
│ /antispam on
│ /antispam off
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── SAVE STATUS ───────────────────
  const enabled =
    sub === "on";

  await setData(
    `antispam/${threadID}`,
    {
      enabled
    }
  );

  return api.sendMessage(

`╭───────────────⭓
│ 🛡️ ANTISPAM
├───────────────⭔
│ Status:
│ ${
  enabled
    ? "✅ ENABLED"
    : "❌ DISABLED"
}
╰───────────────⭓`,

    threadID,
    messageID
  );
};

// ── HANDLE EVENT ────────────────────
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

    // ── DEBUG ───────────────────────
    console.log(
      "MESSAGE:",
      senderID,
      body
    );

    if (!body)
      return;

    // ── BOT ID ──────────────────────
    const botID =
      String(
        api.getCurrentUserID()
      );

    // ── BYPASS ──────────────────────
    if (
      senderID == ownerID ||
      senderID == botID
    ) return;

    // ── CHECK STATUS ────────────────
    let data =
      await getData(
        `antispam/${threadID}`
      );

    if (!data)
      data = {
        enabled: false
      };

    if (!data.enabled)
      return;

    // ── INIT THREAD ─────────────────
    if (
      !spamTracker[threadID]
    ) {

      spamTracker[
        threadID
      ] = {};
    }

    // ── INIT USER ───────────────────
    if (
      !spamTracker[
        threadID
      ][senderID]
    ) {

      spamTracker[
        threadID
      ][senderID] = {

        count: 0,

        warned: false,

        firstTime:
          Date.now()
      };
    }

    const user =
      spamTracker[
        threadID
      ][senderID];

    const now =
      Date.now();

    // ── RESET AFTER 10s ─────────────
    if (
      now -
      user.firstTime >
      10000
    ) {

      user.count = 0;

      user.warned = false;

      user.firstTime =
        now;
    }

    // ── ADD COUNT ───────────────────
    user.count++;

    console.log(
      `SPAM COUNT ${senderID}:`,
      user.count
    );

    // ── WARNING ─────────────────────
    if (
      user.count >= 5 &&
      !user.warned
    ) {

      user.warned = true;

      user.count = 0;

      user.firstTime =
        now;

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ SPAM WARNING
├───────────────⭔
│ User:
│ ${senderID}
│
│ Stop spamming.
│ Next spam
│ = auto kick.
╰───────────────⭓`,

        threadID
      );
    }

    // ── AUTO KICK ───────────────────
    if (
      user.count >= 5 &&
      user.warned
    ) {

      try {

        await api.removeUserFromGroup(
          senderID,
          threadID
        );

        delete spamTracker[
          threadID
        ][senderID];

        return api.sendMessage(

`╭───────────────⭓
│ 🚨 USER KICKED
├───────────────⭔
│ User:
│ ${senderID}
│
│ Reason:
│ Spam detected.
╰───────────────⭓`,

          threadID
        );

      } catch (e) {

        console.log(
          "KICK ERROR:",
          e
        );

        return api.sendMessage(

`╭───────────────⭓
│ ❌ FAILED TO KICK
├───────────────⭔
│ Make sure the
│ bot is admin.
╰───────────────⭓`,

          threadID
        );
      }
    }

  } catch (e) {

    console.log(
      "ANTISPAM ERROR:",
      e
    );
  }
};
