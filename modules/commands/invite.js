const { getData } = require("../../database.js");

module.exports.config = {
  name: "invite",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Invite system",
  commandCategory: "Group",
  usages: "/invite | /invite @mention | /invite list",
  cooldowns: 3
};

module.exports.run = async function ({
  api,
  event,
  args,
  Users
}) {

  try {

    const {
      threadID,
      messageID,
      senderID,
      mentions
    } = event;

    // get database
    let data =
      await getData(
        `inviteSystem/${threadID}`
      );

    if (!data)
      data = {};

    // ── /invite list ─────────────────────
    if (
      args[0] &&
      args[0].toLowerCase() === "list"
    ) {

      const sorted =
        Object.entries(data)
        .sort(
          (a, b) =>
            b[1].count -
            a[1].count
        )
        .slice(0, 20);

      if (sorted.length === 0) {

        return api.sendMessage(

`╭───────────────⭓
│ 📨 INVITE LIST
├───────────────⭔
│ No invite data yet.
╰───────────────⭓`,

          threadID,
          messageID
        );
      }

      let msg =

`╭───────────────⭓
│ 🏆 INVITE LEADERBOARD
├───────────────⭔
`;

      let i = 1;

      for (const [
        uid,
        info
      ] of sorted) {

        const name =
          await Users.getNameUser(uid);

        msg +=

`│ ${i}. ${name}
│ 📨 ${info.count} Invites
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

    // ── /invite @mention ─────────────────
    let targetID = senderID;

    if (
      Object.keys(mentions).length > 0
    ) {

      targetID =
        Object.keys(mentions)[0];
    }

    const userName =
      await Users.getNameUser(
        targetID
      );

    const totalInvites =
      data[targetID]?.count || 0;

    return api.sendMessage(

`╭───────────────⭓
│ 📨 INVITE INFO
├───────────────⭔
│ 👤 ${userName}
│
│ 🏆 Total Invites:
│ ${totalInvites}
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
