const axios = require("axios");
const { getData, setData } = require("../../../database.js");

const bold = (text) => text;

// ── CONFIG ─────────────────────────────────────────────
const AI_NAME = "BARKADA AI";
const VERSION = "1.0.0";
const CREATOR = "Angelica Mateo";

const SYSTEM_PROMPT =
  `You are ${AI_NAME} version ${VERSION}, created by ${CREATOR}.\n` +
  `You are friendly, funny, helpful, and casual.\n` +
  `Reply in Filipino if user speaks Filipino.\n` +
  `Reply in English if user speaks English.\n` +
  `Keep replies natural and conversational.`;

// ── MEMORY ─────────────────────────────────────────────
const history = new Map();

// ── HEADER / FOOTER ────────────────────────────────────
function makeHeader() {
  return (
    `╔════════════════════════════╗\n` +
    `║ 🤖 ${bold(AI_NAME)} ${bold("v" + VERSION)} ║\n` +
    `╚════════════════════════════╝\n`
  );
}

function makeFooter() {
  return (
    `\n━━━━━━━━━━━━━━━━━━\n` +
    `💬 ${bold("Reply")} para mag follow-up`
  );
}

// ── BOT STATUS ─────────────────────────────────────────
async function getBotStatus(threadID) {
  let data = (await getData(`botStatus/${threadID}`)) || {};

  if (typeof data.enabled === "undefined") {
    return true;
  }

  return data.enabled;
}

async function setBotStatus(threadID, status) {
  let data = (await getData(`botStatus/${threadID}`)) || {};

  data.enabled = status;

  await setData(`botStatus/${threadID}`, data);
}

// ── CHAT API ───────────────────────────────────────────
async function chat(message, uid, name, threadID) {
  const h = history.get(threadID) || [];

  h.push({
    role: "user",
    content: message
  });

  try {
    const res = await axios.get(
      "https://norch-project.gleeze.com/api/sim",
      {
        params: {
          prompt: `${SYSTEM_PROMPT}\n\nUser: ${message}`,
          uid,
          name
        },
        timeout: 20000
      }
    );

    let reply = res.data?.reply || "Wala akong maisagot.";

    h.push({
      role: "assistant",
      content: reply
    });

    if (h.length > 20) {
      h.splice(0, 2);
    }

    history.set(threadID, h);

    return reply;

  } catch (e) {
    console.error("[AI ERROR]", e.message);
    return "Hindi ako makareply ngayon, try ulit mamaya.";
  }
}

// ── CONFIG ─────────────────────────────────────────────
module.exports.config = {
  name: "bot",
  version: VERSION,
  hasPermission: 0,
  credits: CREATOR,
  description: "Auto AI reply system",
  commandCategory: "AI",
  usages: "/bot on | /bot off | /bot status",
  cooldowns: 2
};

// ── AUTO REPLY ─────────────────────────────────────────
module.exports.handleEvent = async function ({ api, event }) {
  try {
    const body = (event.body || "").trim();

    if (!body) return;

    const senderID = String(event.senderID);
    const threadID = event.threadID;
    const botID = String(api.getCurrentUserID());

    // ignore sariling message
    if (senderID === botID) return;

    // check status
    const isOn = await getBotStatus(threadID);

    if (!isOn) return;

    let trigger = false;

    // trigger words
    if (/\b(bot|jandel)\b/i.test(body)) {
      trigger = true;
    }

    // reply trigger
    if (
      event.type === "message_reply" &&
      event.messageReply &&
      String(event.messageReply.senderID) === botID &&
      event.messageReply.body?.includes("🤖")
    ) {
      trigger = true;
    }

    if (!trigger) return;

    // clean text
    let cleaned = body
      .replace(/\b(bot|jandel)\b/gi, "")
      .trim();

    if (!cleaned) cleaned = "hello";

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    // get user info
    let userName = "Guest";

    try {
      const userInfo = await api.getUserInfo(senderID);

      userName =
        userInfo[senderID]?.name ||
        "Guest";

    } catch {}

    const answer = await chat(
      cleaned,
      senderID,
      userName,
      threadID
    );

    api.setMessageReaction("✅", event.messageID, () => {}, true);

    const finalReply =
      makeHeader() +
      `💬 ${bold("SAGOT")}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${answer} 🤖` +
      makeFooter();

    return api.sendMessage(
      finalReply,
      threadID,
      event.messageID
    );

  } catch (e) {
    console.error("bot.js fatal:", e);
  }
};

// ── COMMANDS ───────────────────────────────────────────
module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;

  if (!args[0]) {
    return api.sendMessage(
      `╔════════════════════╗\n` +
      `║ 🤖 ${bold(AI_NAME)} ║\n` +
      `╚════════════════════╝\n\n` +
      `📌 ${bold("/bot on")} — enable AI\n` +
      `📌 ${bold("/bot off")} — disable AI\n` +
      `📌 ${bold("/bot status")} — check status`,
      threadID,
      event.messageID
    );
  }

  const choice = args[0].toLowerCase();

  // ON
  if (choice === "on") {
    await setBotStatus(threadID, true);

    return api.sendMessage(
      `✅ ${bold("Bot replies are now ON")}`,
      threadID,
      event.messageID
    );
  }

  // OFF
  if (choice === "off") {
    await setBotStatus(threadID, false);

    return api.sendMessage(
      `⛔ ${bold("Bot replies are now OFF")}`,
      threadID,
      event.messageID
    );
  }

  // STATUS
  if (choice === "status") {
    const isOn = await getBotStatus(threadID);

    return api.sendMessage(
      `📊 ${bold("Bot Status")}\n\n` +
      `${isOn ? "✅ ON" : "⛔ OFF"}`,
      threadID,
      event.messageID
    );
  }

  return api.sendMessage(
    "❌ Invalid option.\nUse: /bot on | off | status",
    threadID,
    event.messageID
  );
};
