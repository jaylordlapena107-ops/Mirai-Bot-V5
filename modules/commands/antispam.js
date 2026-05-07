const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "antispam",
  version: "2.0.0",
  credits: "ChatGPT",
  description: "Anti spam system with warning and auto kick",
  usages: "/antispam on | off",
  commandCategory: "moderation",
  cooldowns: 3,
};

// ── SPAM TRACKER ─────────────────────────
let spamTracker = {};

// SETTINGS
const SPAM_LIMIT = 5; // 5 messages
const SPAM_TIME = 10000; // 10 seconds

// ── COMMAND ─────────────────────────────
module.exports.run = async function ({
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

  // admin check
  const info =
    await api.getThreadInfo(
      threadID
    );

  const isAdmin =
    info.adminIDs.some(
      a => a.id == senderID
    );

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

  // invalid
  if (
    sub !== "on" &&
    sub !== "off"
  ) {

    return api.sendMessage(

`╭───────────────⭓
│ 🛡️ ANTI SPAM
├───────────────⭔
│ 📌 Usage:
│ /antispam on
│ /antispam off
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ON
  if (sub === "on") {

    await setData(
      `antispam/${threadID}`,
      {
        enabled: true
      }
    );

    return api.sendMessage(

`╭───────────────⭓
│ ✅ ANTI SPAM ENABLED
├───────────────⭔
│ Users who send
│ ${SPAM_LIMIT} messages within
│ ${SPAM_TIME / 1000} seconds
│ will be warned.
│
│ Next offense
│ = auto kick.
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // OFF
  if (sub === "off") {

    await setData(
      `antispam/${threadID}`,
      {
        enabled: false
      }
    );

    return api.sendMessage(

`╭───────────────⭓
│ 🛑 ANTI SPAM DISABLED
╰───────────────⭓`,

      threadID,
      messageID
    );
  }
};

// ── HANDLE EVENT ───────────────────────
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

    // get status
    let data =
      await getData(
        `antispam/${threadID}`
      );

    if (
      !data ||
      data.enabled !== true
    ) return;

    // ignore admins
    const info =
      await api.getThreadInfo(
        threadID
      );

    const isAdmin =
      info.adminIDs.some(
        a => a.id == senderID
      );

    if (isAdmin)
      return;

    // init thread
    if (
      !spamTracker[threadID]
    ) {

      spamTracker[threadID] = {};
    }

    // init user
    if (
      !spamTracker[threadID][senderID]
    ) {

      spamTracker[threadID][senderID] = {
        count: 0,
        firstTime: Date.now(),
        warned: false
      };
    }

    const user =
      spamTracker[threadID][senderID];

    const now =
      Date.now();

    // reset after time
    if (
      now - user.firstTime >
      SPAM_TIME
    ) {

      user.count = 0;
      user.firstTime = now;
    }

    // add message count
    user.count++;

    // warning
    if (
      user.count >= SPAM_LIMIT &&
      !user.warned
    ) {

      user.warned = true;

      user.count = 0;

      user.firstTime = now;

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ SPAM WARNING
├───────────────⭔
│ User:
│ ${senderID}
│
│ Stop sending
│ messages too fast.
│
│ Next spam
│ = auto kick.
╰───────────────⭓`,

        threadID
      );
    }

    // second offense
    if (
      user.count >= SPAM_LIMIT &&
      user.warned
    ) {

      try {

        await api.removeUserFromGroup(
          senderID,
          threadID
        );

        delete spamTracker
          [threadID]
          [senderID];

        return api.sendMessage(

`╭───────────────⭓
│ 🚨 USER KICKED
├───────────────⭔
│ ${senderID}
│ was removed
│ for spamming.
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
