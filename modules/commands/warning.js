const { setData, getData } = require("../../database.js");
const bold = require("../../utils/bold");

// ── CONFIG ─────────────────────────────────────────────
const MAX_DISPLAY_ADMINS = 5;

// ── BAD WORDS ──────────────────────────────────────────
const badwords = [
  "tanga", "bobo", "gago", "puta", "pakyu", "inutil", "ulol",
  "fuck", "shit", "asshole", "bitch", "dumb", "stupid", "motherfucker",
  "laplap", "pota", "inamo", "tangina", "tang ina", "kantut", "kantot",
  "jakol", "jakul", "jabol", "supot", "blow job", "blowjob",
  "puke", "puki", "baliw"
];

// ── RACIST WORDS ───────────────────────────────────────
const racistWords = [
  "negro", "nigger", "chimp", "nigga", "baluga",
  "chink", "indio", "bakla", "niga", "bungal",
  "beki", "nig", "negra"
];

// ── ALLOWED LINKS ──────────────────────────────────────
const allowedLinks = [
  "facebook.com",
  "fb.com",
  "facebook.com/groups",
  "fb.com/groups",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "roblox.com"
];

// ── WARNING MESSAGES ───────────────────────────────────
const messages = {
  badword: [
    "Please maintain respect in this group.",
    "Offensive words are not tolerated here.",
    "Language matters. Kindly watch your words.",
    "This is your warning for using bad language."
  ],

  racist: [
    "Racist or discriminatory remarks are strictly prohibited.",
    "Respect diversity. Avoid racist language.",
    "This group does not tolerate discrimination.",
    "Be mindful. Racist terms are not accepted."
  ],

  link: [
    "Unauthorized links are not allowed here.",
    "Please avoid suspicious links.",
    "Links outside the allowed list are prohibited.",
    "Your message contains an unauthorized link."
  ]
};

// ── RANDOM PICKER ──────────────────────────────────────
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── GET USER NAME ──────────────────────────────────────
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info[uid]?.name || "User";
  } catch {
    return "User";
  }
}

// ── FORMAT WARNING ─────────────────────────────────────
function formatWarning(name, type, note, count) {
  return (
    `╔══════════════════╗\n` +
    `║ ⚠️ ${bold("WARNING")}\n` +
    `╚══════════════════╝\n\n` +
    `👤 User: ${name}\n` +
    `🚫 Violation: ${type}\n` +
    `📝 Note: ${note}\n\n` +
    `⚠️ Warnings: ${count}/5`
  );
}

// ── MODULE CONFIG ──────────────────────────────────────
module.exports.config = {
  name: "warning",
  version: "1.0.1",
  hasPermssion: 1,
  credits: "ChatGPT + AI",
  description: "Auto warning system",
  commandCategory: "System",
  usages: "warning check @mention | warning list",
  cooldowns: 5
};

// ── COMMANDS ───────────────────────────────────────────
module.exports.run = async function ({
  api,
  event,
  args
}) {

  const { threadID, messageID, mentions } = event;

  if (!args[0]) {
    return api.sendMessage(
      `╔══════════════════╗\n` +
      `║ ⚠️ ${bold("WARNING HELP")} ║\n` +
      `╚══════════════════╝\n\n` +
      `📋 warning list → show warned users\n` +
      `🔍 warning check @user → check warnings`,
      threadID,
      messageID
    );
  }

  const sub = args[0].toLowerCase();

  // ── CHECK ────────────────────────────────────────────
  if (sub === "check") {

    const uid = Object.keys(mentions)[0];

    if (!uid) {
      return api.sendMessage(
        `⚠️ ${bold("Please mention a user.")}`,
        threadID,
        messageID
      );
    }

    const warnings =
      await getData(`warnings/${threadID}/${uid}`) ||
      { count: 0 };

    const name =
      await getUserName(uid, api);

    return api.sendMessage(
      `👤 ${name}\n⚠️ Warnings: ${warnings.count}/5`,
      threadID,
      messageID
    );
  }

  // ── LIST ─────────────────────────────────────────────
  if (sub === "list") {

    const all =
      await getData(`warnings/${threadID}/_all`) || [];

    if (all.length === 0) {
      return api.sendMessage(
        `📋 ${bold("No warned users found.")}`,
        threadID,
        messageID
      );
    }

    let msg =
      `╔══════════════════╗\n` +
      `║ 📋 ${bold("WARNING LIST")} ║\n` +
      `╚══════════════════╝\n\n`;

    for (const uid of all) {

      const warnings =
        await getData(`warnings/${threadID}/${uid}`);

      if (warnings && warnings.count > 0) {

        const name =
          await getUserName(uid, api);

        msg +=
          `👤 ${name}\n` +
          `⚠️ ${warnings.count}/5 warnings\n\n`;
      }
    }

    return api.sendMessage(
      msg,
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `❌ Invalid option.`,
    threadID,
    messageID
  );
};

// ── AUTO DETECT ────────────────────────────────────────
module.exports.handleEvent = async function ({
  api,
  event
}) {

  try {

    const {
      threadID,
      senderID,
      body,
      messageID
    } = event;

    if (!body) return;

    // ── IGNORE BOT ITSELF ──────────────────────────────
    if (senderID == api.getCurrentUserID()) return;

    // ── IGNORE BOT ADMINS ──────────────────────────────
    if (
      global.config.ADMINBOT &&
      global.config.ADMINBOT.includes(senderID)
    ) return;

    const text =
      body.toLowerCase();

    const words =
      text.replace(/[^\w\s]/g, "")
      .split(/\s+/);

    let violationType = null;
    let note = "";

    // ── BAD WORD ───────────────────────────────────────
    if (
      badwords.some(word =>
        words.includes(word)
      )
    ) {

      violationType = "Bad Language";

      note = pickRandom(messages.badword);
    }

    // ── RACIST ─────────────────────────────────────────
    if (
      racistWords.some(word =>
        words.includes(word)
      )
    ) {

      violationType = "Racist Language";

      note = pickRandom(messages.racist);
    }

    // ── LINK ───────────────────────────────────────────
    if (/https?:\/\/|www\./.test(text)) {

      const allowed =
        allowedLinks.some(link =>
          text.includes(link)
        );

      if (!allowed) {

        violationType = "Unauthorized Link";

        note = pickRandom(messages.link);
      }
    }

    if (!violationType) return;

    // ── GET WARNINGS ───────────────────────────────────
    let warnings =
      await getData(`warnings/${threadID}/${senderID}`);

    if (!warnings) {
      warnings = {
        count: 0,
        lastUpdated: Date.now()
      };
    }

    // ── RESET AFTER 24 HOURS ───────────────────────────
    if (
      Date.now() - warnings.lastUpdated >=
      24 * 60 * 60 * 1000
    ) {
      warnings.count = 0;
    }

    warnings.count++;
    warnings.lastUpdated = Date.now();

    await setData(
      `warnings/${threadID}/${senderID}`,
      warnings
    );

    // ── TRACK USERS ────────────────────────────────────
    let all =
      await getData(`warnings/${threadID}/_all`) || [];

    if (!all.includes(senderID)) {

      all.push(senderID);

      await setData(
        `warnings/${threadID}/_all`,
        all
      );
    }

    const name =
      await getUserName(senderID, api);

    // ── GET ADMINS ─────────────────────────────────────
    const info =
      await api.getThreadInfo(threadID);

    const adminIDs =
      info.adminIDs.map(a => a.id);

    const mentions = [];

    for (const id of adminIDs) {

      if (id === senderID) continue;

      const adminName =
        await getUserName(id, api);

      mentions.push({
        tag: `@${adminName}`,
        id
      });
    }

    const displayAdmins =
      mentions.slice(0, MAX_DISPLAY_ADMINS);

    const extra =
      mentions.length - displayAdmins.length;

    const adminLine =
      displayAdmins
      .map(m => m.tag)
      .join(" | ") +
      (extra > 0
        ? ` ... (+${extra} more)`
        : "");

    // ── MESSAGE ────────────────────────────────────────
    let msg =
      formatWarning(
        name,
        violationType,
        note,
        warnings.count
      );

    if (warnings.count >= 5) {

      msg +=
        `\n\n⛔ User reached 5 warnings.\n` +
        `Auto kick will be applied.`;
    }

    if (mentions.length > 0) {

      msg +=
        `\n\n📢 Admins: ${adminLine}`;
    }

    // ── SEND WARNING ───────────────────────────────────
    api.sendMessage(
      {
        body: msg,
        mentions: [
          {
            tag: `@${name}`,
            id: senderID
          },
          ...mentions
        ]
      },
      threadID,
      null,
      messageID
    );

    // ── AUTO KICK ──────────────────────────────────────
    if (warnings.count >= 5) {

      try {

        await api.removeUserFromGroup(
          senderID,
          threadID
        );

        await api.sendMessage(
          {
            body: `⛔ @${name} has been removed from the group.`,
            mentions: [
              {
                tag: `@${name}`,
                id: senderID
              }
            ]
          },
          threadID
        );

        await setData(
          `warnings/${threadID}/${senderID}`,
          {
            count: 0,
            lastUpdated: Date.now()
          }
        );

      } catch (err) {

        console.error(
          "Kick failed:",
          err
        );
      }
    }

  } catch (e) {

    console.error(
      "warning.js error:",
      e
    );
  }
};
