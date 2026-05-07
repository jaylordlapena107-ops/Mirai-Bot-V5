const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "invite",
  version: "2.0.0",
  hasPermssion: 1,
  credits: "ChatGPT",
  description: "Track member invitations",
  commandCategory: "Group",
  usages: "/invite top | /invite reset",
  cooldowns: 3
};

// ── GET MONEY ─────────────────────────────
async function getMoney(uid) {

  let data =
    await getData(`bank/${uid}`);

  if (!data)
    data = {};

  return data.money || 0;
}

// ── SET MONEY ─────────────────────────────
async function setMoney(uid, amount) {

  let data =
    await getData(`bank/${uid}`);

  if (!data)
    data = {};

  data.money = amount;

  await setData(
    `bank/${uid}`,
    data
  );
}

// ── ADD MONEY ─────────────────────────────
async function addMoney(uid, amount) {

  const current =
    await getMoney(uid);

  const updated =
    current + amount;

  await setMoney(
    uid,
    updated
  );

  return updated;
}

// ── HANDLE JOIN EVENT ─────────────────────
module.exports.handleEvent = async function ({
  api,
  event,
  Users
}) {

  try {

    if (
      event.logMessageType !==
      "log:subscribe"
    ) return;

    const {
      threadID,
      author,
      logMessageData
    } = event;

    const addedUsers =
      logMessageData
      .addedParticipants || [];

    const botID =
      String(
        api.getCurrentUserID()
      );

    // ignore if bot added
    const isBotAdded =
      addedUsers.some(
        u =>
          String(u.userFbId)
          === botID
      );

    if (isBotAdded)
      return;

    // inviter
    const inviterID =
      String(author);

    const inviterName =
      await Users.getNameUser(
        inviterID
      );

    // get invite database
    let data =
      await getData(
        `inviteSystem/${threadID}`
      );

    if (!data)
      data = {};

    // init
    if (!data[inviterID]) {

      data[inviterID] = {
        count: 0
      };
    }

    // add invite count
    data[inviterID].count +=
      addedUsers.length;

    // save invite data
    await setData(
      `inviteSystem/${threadID}`,
      data
    );

    // ── MONEY REWARD ─────────────────

    const reward =
      50 * addedUsers.length;

    const totalBalance =
      await addMoney(
        inviterID,
        reward
      );

    // total invites
    const totalInvites =
      data[inviterID].count;

    // names
    let addedText = "";

    for (const user of addedUsers) {

      addedText +=
`👤 ${user.fullName}
`;
    }

    // send message
    return api.sendMessage(

`╭───────────────⭓
│ 🎉 MEMBER INVITED
├───────────────⭔
${addedText}
│ 📨 Invited By:
│ ${inviterName}
│
│ 🏆 Total Invited:
│ ${totalInvites}
│
│ 💸 Reward:
│ +${reward} Money
│
│ 🏦 Total Balance:
│ ${totalBalance}
╰───────────────⭓`,

      threadID
    );

  } catch (e) {

    console.log(
      "INVITE ERROR:",
      e
    );

  }
};

// ── COMMANDS ─────────────────────────────
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

    // ── TOP ──────────────────────────
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

      if (
        sorted.length === 0
      ) {

        return api.sendMessage(

`╭───────────────⭓
│ 📊 INVITE TOP
├───────────────⭔
│ No invite data yet.
╰───────────────⭓`,

          threadID,
          messageID
        );
      }

      let msg =

`╭───────────────⭓
│ 🏆 TOP INVITERS
├───────────────⭔
`;

      let i = 1;

      for (const [
        uid,
        info
      ] of sorted) {

        const name =
          await Users.getNameUser(
            uid
          );

        msg +=

`│ ${i}. ${name}
│ 📨 ${info.count} invites
│
`;

        i++;
      }

      msg +=
`╰───────────────⭓`;

      return api.sendMessage(
        msg,
        threadID,
        messageID
      );
    }

    // ── RESET ────────────────────────
    if (option === "reset") {

      await setData(
        `inviteSystem/${threadID}`,
        {}
      );

      return api.sendMessage(

`╭───────────────⭓
│ 🗑️ INVITE RESET
├───────────────⭔
│ Invite data cleared.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // ── DEFAULT ──────────────────────
    return api.sendMessage(

`╭───────────────⭓
│ 📨 INVITE SYSTEM
├───────────────⭔
│ 📌 /invite top
│ View leaderboard
│
│ 📌 /invite reset
│ Reset invite data
╰───────────────⭓`,

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
