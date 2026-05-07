const {
  getData,
  setData
} = require("../../database.js");

module.exports.config = {
  name: "antispam",
  version: "3.0.0",
  credits: "ChatGPT",
  description:
    "Anti spam system with warning + auto kick",
  usages:
    "/antispam on | off",
  commandCategory:
    "moderation",
  cooldowns: 3
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
  if (senderID == ownerID) {

    // owner can use directly

  } else {

    // ── GET ADMIN INFO ──────────────
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

      console.log(
        "THREAD INFO ERROR:",
        e
      );

      return api.sendMessage(

`╭───────────────⭓
│ ❌ FAILED
├───────────────⭔
│ Cannot get
│ group info.
│
│ Try again later.
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

  // ── INVALID ───────────────────────
  if (
    sub !== "on" &&
    sub !== "off"
  ) {

    return api.sendMessage(

`╭───────────────⭓
│ 🛡️ ANTISPAM
├───────────────⭔
│ 📌 Usage:
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

    if (!body)
      return;

    // ── OWNER + BOT BYPASS ─────────
    const botID =
      String(
        api.getCurrentUserID()
      );

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

    // ── INIT TRACKER ────────────────
    if (
      !spamTracker[threadID]
    ) {

      spamTracker[
        threadID
      ] = {};
    }

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

    // ── COUNT EVERY MESSAGE ─────────
    user.count++;

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
│ Next offense
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
