const axios = require("axios");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "bot",
  version: "4.0.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Auto AI reply when 'bot' or 'jandel' is mentioned, with on/off toggle",
  commandCategory: "AI",
  usages: "/bot on | /bot off | /bot status",
  cooldowns: 0,
};

async function getBotStatus(threadID) {
  let data = (await getData(`botStatus/${threadID}`)) || {};
  if (typeof data.enabled === "undefined") return true; // default ON
  return data.enabled;
}

async function setBotStatus(threadID, status) {
  let data = (await getData(`botStatus/${threadID}`)) || {};
  data.enabled = status;
  await setData(`botStatus/${threadID}`, data);
}

module.exports.handleEvent = async function ({ api, event }) {
  try {
    const body = (event.body || "").trim();
    if (!body) return;

    const sender = String(event.senderID);
    const threadID = event.threadID;
    const botID = String(api.getCurrentUserID());

    // Ignore sariling message ng bot
    if (sender === botID) return;

    // Check kung naka ON
    const isOn = await getBotStatus(threadID);
    if (!isOn) return;

    let trigger = false;

    // Trigger kapag may "bot" or "jandel"
    if (/\b(bot|jandel)\b/i.test(body)) {
      trigger = true;
    }

    // Trigger kapag reply sa bot
    if (
      event.type === "message_reply" &&
      event.messageReply &&
      String(event.messageReply.senderID) === botID &&
      event.messageReply.body?.trim().endsWith("🤖")
    ) {
      trigger = true;
    }

    if (!trigger) return;

    // Clean text
    let cleaned = body.replace(/\b(bot|jandel)\b/gi, "").trim();
    if (!cleaned) cleaned = "hello";

    // NEW API
    const API_URL = "https://norch-project.gleeze.com/api/sim";

    let reply;

    try {
      const res = await axios.get(API_URL, {
        params: {
          prompt: cleaned,
          uid: sender,
          name: "Guest",
        },
        timeout: 20000,
      });

      reply = res.data?.reply || null;

    } catch (err) {
      console.error("AI API error:", err.message);
    }

    if (!reply) {
      reply = "Hindi ako makareply ngayon, try ulit mamaya.";
    }

    return api.sendMessage(
      `${reply} 🤖`,
      threadID,
      event.messageID
    );

  } catch (e) {
    console.error("bot.js fatal:", e);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;

  if (!args[0]) {
    return api.sendMessage(
      "Gamitin: /bot on | /bot off | /bot status",
      threadID,
      event.messageID
    );
  }

  const choice = args[0].toLowerCase();

  if (choice === "on") {
    await setBotStatus(threadID, true);

    return api.sendMessage(
      "✅ Bot replies are now ON in this thread.",
      threadID,
      event.messageID
    );

  } else if (choice === "off") {
    await setBotStatus(threadID, false);

    return api.sendMessage(
      "⛔ Bot replies are now OFF in this thread.",
      threadID,
      event.messageID
    );

  } else if (choice === "status") {
    const isOn = await getBotStatus(threadID);

    return api.sendMessage(
      `📊 Bot status in this thread: ${isOn ? "✅ ON" : "⛔ OFF"}`,
      threadID,
      event.messageID
    );

  } else {
    return api.sendMessage(
      "Gamitin: /bot on | /bot off | /bot status",
      threadID,
      event.messageID
    );
  }
};
