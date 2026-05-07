const {
  setData,
  getData
} = require("../../database.js");

module.exports.config = {
  name: "antispam",
  version: "2.0.0",
  credits: "Jaylord + ChatGPT",
  description:
    "Anti spam with warning and auto kick",
  usages:
    "/antispam on | off",
  commandCategory:
    "moderation",
  cooldowns: 3
};

// ── MEMORY TRACKER ───────────────────
let spamTracker = {};

// ── COMMAND ──────────────────────────
module.exports.run =
async function ({
  api,
  event,
  args
}) {

  try {

    const {
      threadID,
      messageID,
      senderID
    } = event;

    const info =
      await api.getThreadInfo(
        threadID
      );

    const isAdmin =
      info.adminIDs.some(
        a => a.id == senderID
      );

    // gc admin only
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

    const sub =
      (args[0] || "")
      .toLowerCase();

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
│ 🛡️ ANTI SPAM
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

  } catch (e) {

    console.log(
      "ANTISPAM CMD ERROR:",
      e
    );
  }
};

// ── HANDLE EVENT ─────────────────────
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

    // check status
    const settings =
      await getData(
        `antispam/${threadID}`
      );

    if (
      !settings ||
      settings.enabled !== true
    ) return;

    // init gc
    if (
      !spamTracker[threadID]
    ) {

      spamTracker[
        threadID
      ] = {};
    }

    // init user
    if (
      !spamTracker[threadID][senderID]
    ) {

      spamTracker[
        threadID
      ][senderID] = {

        count: 0,
        warned: false,
        lastMessage: "",
        firstTime:
          Date.now()
      };
    }

    const userData =
      spamTracker[
        threadID
      ][senderID];

    const now =
      Date.now();

    // reset after 10 sec
    if (
      now -
      userData.firstTime >
      10000
    ) {

      userData.count = 0;

      userData.warned = false;

      userData.firstTime =
        now;

      userData.lastMessage =
        "";
    }

    // same msg spam
    if (
      body ===
      userData.lastMessage
    ) {

      userData.count++;

    } else {

      userData.count = 1;

      userData.lastMessage =
        body;

      userData.firstTime =
        now;
    }

    // warning
    if (
      userData.count >= 5 &&
      !userData.warned
    ) {

      userData.warned = true;

      userData.count = 0;

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ SPAM WARNING
├───────────────⭔
│ Stop spamming.
│
│ Next spam will
│ result in kick.
╰───────────────⭓`,

        threadID
      );
    }

    // kick
    if (
      userData.count >= 5 &&
      userData.warned
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
│ 🚨 SPAM DETECTED
├───────────────⭔
│ User has been
│ kicked for spam.
╰───────────────⭓`,

          threadID
        );

      } catch {

        return api.sendMessage(

`╭───────────────⭓
│ ❌ FAILED
├───────────────⭔
│ Cannot kick user.
│ Make sure bot
│ is admin.
╰───────────────⭓`,

          threadID
        );
      }
    }

  } catch (e) {

    console.log(
      "ANTISPAM EVENT ERROR:",
      e
    );
  }
};
