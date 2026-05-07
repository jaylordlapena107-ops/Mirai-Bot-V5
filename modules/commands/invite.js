const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "invite",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "ChatGPT",
  description: "Track member invitations",
  commandCategory: "Group",
  usages: "/invite top | /invite reset",
  cooldowns: 3
};

// ── SAVE LAST MEMBERS ─────────────────────────────
const memberCache = new Map();

// ── HANDLE JOIN EVENT ────────────────────────────
module.exports.handleEvent = async function ({
  api,
  event,
  Users
}) {

  try {

    // detect member add
    if (
      event.logMessageType !==
      "log:subscribe"
    ) return;

    const {
      threadID,
      author,
      logMessageData
    } = event;

    // ignore bot added
    const addedUsers =
      logMessageData.addedParticipants || [];

    const botID =
      String(api.getCurrentUserID());

    const isBotAdded =
      addedUsers.some(
        u => String(u.userFbId) === botID
      );

    if (isBotAdded)
      return;

    // inviter
    const inviterID =
      String(author);

    const inviterName =
      await Users.getNameUser(inviterID);

    // get database
    let data =
      await getData(
        `inviteSystem/${threadID}`
      );

    if (!data)
      data = {};

    // init inviter
    if (!data[inviterID]) {

      data[inviterID] = {
        count: 0
      };
    }

    // add invites
    data[inviterID].count +=
      addedUsers.length;

    // save
    await setData(
      `inviteSystem/${threadID}`,
      data
    );

    // total invites
    const totalInvites =
      data[inviterID].count;

    // names added
    let addedText = "";

    for (const user of addedUsers) {

      addedText +=
        `👤 ${user.fullName}\n`;
    }

    // send message
    return api.sendMessage(

`━━━━━━━━━━━━━━━
🎉 MEMBER INVITED

${addedText}
📨 Invited By:
${inviterName}

🏆 Total Invited:
${totalInvites}

━━━━━━━━━━━━━━━`,

      threadID
    );

  } catch (e) {

    console.log(
      "INVITE ERROR:",
      e
    );

  }
};

// ── COMMANDS ─────────────────────────────────────
module.exports.run = async function ({
  api,
  event,
  args,
  Users
}) {

  try {

    const {
      threadID,
      messageID
    } = event;

    const option =
      (args[0] || "")
      .toLowerCase();

    // ── TOP INVITERS ─────────────────────────
    if (option === "top") {

      let data =
        await getData(
          `inviteSystem/${threadID}`
        );

      if (!data)
        data = {};

      const sorted =
        Object.entries(data)
        .sort(
          (a, b) =>
            b[1].count -
            a[1].count
        )
        .slice(0, 10);

      if (sorted.length === 0) {

        return api.sendMessage(
`━━━━━━━━━━━━━━━
📊 INVITE LEADERBOARD

No invite data yet.
━━━━━━━━━━━━━━━`,
          threadID,
          messageID
        );
      }

      let msg =
`━━━━━━━━━━━━━━━
🏆 INVITE LEADERBOARD

`;

      let i = 1;

      for (const [
        uid,
        info
      ] of sorted) {

        const name =
          await Users.getNameUser(uid);

        msg +=
`${i}. ${name}
📨 ${info.count} invites

`;

        i++;
      }

      msg +=
`━━━━━━━━━━━━━━━`;

      return api.sendMessage(
        msg,
        threadID,
        messageID
      );
    }

    // ── RESET ───────────────────────────────
    if (option === "reset") {

      await setData(
        `inviteSystem/${threadID}`,
        {}
      );

      return api.sendMessage(
`━━━━━━━━━━━━━━━
🗑️ INVITE DATA RESET
━━━━━━━━━━━━━━━`,
        threadID,
        messageID
      );
    }

    // ── DEFAULT ─────────────────────────────
    return api.sendMessage(

`━━━━━━━━━━━━━━━
📨 INVITE SYSTEM

📌 /invite top
View top inviters

📌 /invite reset
Reset invite data

━━━━━━━━━━━━━━━`,

      threadID,
      messageID
    );

  } catch (e) {

    console.log(
      "INVITE CMD ERROR:",
      e
    );

  }
};
