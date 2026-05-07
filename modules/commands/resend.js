const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "resend",
  version: "5.2.0",
  hasPermssion: 0,
  credits: "Thọ & Edited",
  description: "Resend unsent text messages",
  usePrefix: true,
  commandCategory: "general",
  usages: "resend",
  cooldowns: 0,
  hide: true
};

// ── HANDLE EVENTS ─────────────────────────────────
module.exports.handleEvent = async function ({
  event,
  api,
  Users
}) {

  try {

    const {
      messageID,
      senderID,
      threadID,
      body
    } = event;

    // create storage
    if (!global.logMessage)
      global.logMessage = new Map();

    // bot id
    if (!global.data.botID)
      global.data.botID =
        api.getCurrentUserID();

    // ignore bot messages
    if (
      String(senderID) ===
      String(global.data.botID)
    ) return;

    // get resend status
    let data =
      await getData(
        `resend/${threadID}`
      );

    if (!data)
      data = {};

    // resend off
    if (data.enabled === false)
      return;

    // save text messages only
    if (
      event.type !== "message_unsend" &&
      body
    ) {

      global.logMessage.set(
        messageID,
        {
          body,
          senderID
        }
      );

      return;
    }

    // detect unsend
    if (
      event.type ===
      "message_unsend"
    ) {

      const msgData =
        global.logMessage.get(
          messageID
        );

      if (!msgData)
        return;

      const name =
        await Users.getNameUser(
          senderID
        );

      return api.sendMessage(

`╭───────────────⭓
│ 🚨 MESSAGE UNSENT
├───────────────⭔
│ 👤 ${name}
│
│ 💬 ${msgData.body}
╰───────────────⭓`,

        threadID
      );
    }

  } catch (e) {

    console.log(
      "RESEND ERROR:",
      e.message
    );

  }
};

// ── COMMAND ───────────────────────────────────────
module.exports.run = async function ({
  api,
  event
}) {

  try {

    const {
      threadID,
      messageID,
      senderID
    } = event;

    // get thread info
    const threadInfo =
      await api.getThreadInfo(
        threadID
      );

    // check admin
    const isAdmin =
      threadInfo.adminIDs.some(
        admin =>
          String(admin.id) ===
          String(senderID)
      );

    // deny access
    if (!isAdmin) {

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ ACCESS DENIED
├───────────────⭔
│ Only group admins
│ can use this command.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // get data
    let data =
      await getData(
        `resend/${threadID}`
      );

    if (!data)
      data = {};

    // toggle
    if (
      typeof data.enabled ===
      "undefined" ||
      data.enabled === false
    ) {

      data.enabled = true;

    } else {

      data.enabled = false;

    }

    // save database
    await setData(
      `resend/${threadID}`,
      data
    );

    return api.sendMessage(

`╭───────────────⭓
│ 📡 RESEND SYSTEM
├───────────────⭔
│ Status:
│ ${data.enabled ? "✅ ENABLED" : "❌ DISABLED"}
╰───────────────⭓`,

      threadID,
      messageID
    );

  } catch (e) {

    console.log(
      "RESEND CMD ERROR:",
      e.message
    );

  }
};
