const { getData, setData } = require("../../database.js");
const axios = require("axios");

module.exports.config = {
  name: "rank",
  version: "4.1.0",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Auto rank up system with leaderboard",
  commandCategory: "fun",
  usages: "/rank | /rank @mention | /rank list",
  cooldowns: 5
};

// ── RANK NAMES ─────────────────────────
const rankNames = [
  "Rookie", "Beginner", "Apprentice", "Novice", "Intermediate",
  "Skilled", "Specialist", "Expert", "Veteran", "Elite",
  "Master", "Grandmaster", "Legend", "Mythic", "Immortal",
  "Eternal", "Shadow", "Guardian", "Slayer", "Champion",
  "Hero", "Conqueror", "Overlord", "Demigod", "Godlike",
  "Celestial", "Divine", "Supreme", "Infinity", "Omega",
  "Titan", "Warlord", "Sentinel", "Invoker", "Archmage",
  "Overseer", "Emperor", "Abyssal", "Phoenix", "Dragonlord",
  "Stormbringer", "Doombringer", "Lightbringer", "Voidwalker", "Starborn",
  "Timekeeper", "Worldbreaker", "Chaosbringer", "Balancekeeper", "Transcendent"
];

// ── REQUIRED XP ────────────────────────
function getRequiredXP(level) {
  return level * 200;
}

// ── HANDLE CHAT EVENT ─────────────────
module.exports.handleEvent =
async function ({
  api,
  event,
  Users
}) {

  try {

    if (!event.body)
      return;

    const {
      threadID,
      senderID
    } = event;

    // ── IGNORE BOT ───────────────────
    if (
      senderID ==
      api.getCurrentUserID()
    ) return;

    const path =
      `rank/${threadID}/${senderID}`;

    let userData =
      await getData(path);

    if (!userData) {

      userData = {
        level: 1,
        xp: 0,
        name: "",
        messages: 0,
        rankName: "Rookie"
      };
    }

    // update name
    userData.name =
      await Users.getNameUser(
        senderID
      );

    // add messages
    userData.messages += 1;

    // random xp
    const xpGain =
      Math.floor(
        Math.random() * 11
      ) + 5;

    userData.xp += xpGain;

    let leveledUp = false;

    // ── AUTO LEVEL UP ───────────────
    while (
      userData.xp >=
      getRequiredXP(
        userData.level
      )
    ) {

      userData.xp -=
        getRequiredXP(
          userData.level
        );

      userData.level++;

      leveledUp = true;
    }

    // rank name
    const rankName =
      rankNames[
        userData.level - 1
      ] || "Ascended";

    userData.rankName =
      rankName;

    // save
    await setData(
      path,
      userData
    );

    // ── LEVEL UP MESSAGE ───────────
    if (leveledUp) {

      const requiredXP =
        getRequiredXP(
          userData.level
        );

      const apiUrl =
`https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(userData.name)}&userid=${senderID}&currentLvl=${userData.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${userData.xp}&requiredXP=${requiredXP}`;

      try {

        const response =
          await axios.get(
            apiUrl,
            {
              responseType:
                "stream"
            }
          );

        return api.sendMessage(

          {
            body:
`╭───────────────⭓
│ 🎉 LEVEL UP
├───────────────⭔
│ 👤 ${userData.name}
│
│ 🆙 Level:
│ ${userData.level}
│
│ 🏅 Rank:
│ ${rankName}
╰───────────────⭓`,

            attachment:
              response.data
          },

          threadID
        );

      } catch {

        return api.sendMessage(

`╭───────────────⭓
│ 🎉 LEVEL UP
├───────────────⭔
│ 👤 ${userData.name}
│
│ 🆙 Level:
│ ${userData.level}
│
│ 🏅 Rank:
│ ${rankName}
╰───────────────⭓`,

          threadID
        );
      }
    }

  } catch (e) {

    console.log(
      "RANK EVENT ERROR:",
      e
    );
  }
};

// ── COMMAND ───────────────────────────
module.exports.run =
async function ({
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

    // ── LEADERBOARD ─────────────────
    if (
      args[0] &&
      args[0].toLowerCase() ===
      "list"
    ) {

      const path =
        `rank/${threadID}`;

      const allData =
        await getData(path) || {};

      const users =
        Object.values(allData);

      if (
        users.length === 0
      ) {

        return api.sendMessage(

`╭───────────────⭓
│ ⚠️ NO DATA
├───────────────⭔
│ No rank data
│ found in this GC.
╰───────────────⭓`,

          threadID,
          messageID
        );
      }

      // sort
      users.sort(
        (a, b) => {

          if (
            b.level === a.level
          ) {

            return (
              b.xp - a.xp
            );
          }

          return (
            b.level -
            a.level
          );
        }
      );

      let msg =
`╭───────────────⭓
│ 🏆 RANK LEADERBOARD
├───────────────⭔
`;

      for (
        let i = 0;
        i < Math.min(10, users.length);
        i++
      ) {

        const u =
          users[i];

        msg +=
`│ ${i + 1}. ${u.name}
│ Lv.${u.level} • ${u.rankName}
│ XP: ${u.xp}
│
`;
      }

      msg +=
`╰───────────────⭓`;

      return api.sendMessage(
        msg,
        threadID,
        messageID
      );
    }

    // ── TARGET USER ────────────────
    const targetID =
      Object.keys(
        mentions
      )[0] || senderID;

    const path =
      `rank/${threadID}/${targetID}`;

    const userData =
      await getData(path);

    if (!userData) {

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ NO DATA
├───────────────⭔
│ User has no
│ rank data yet.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    const requiredXP =
      getRequiredXP(
        userData.level
      );

    const apiUrl =
`https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(userData.name)}&userid=${targetID}&currentLvl=${userData.level}&currentRank=${encodeURIComponent(userData.rankName)}&currentXP=${userData.xp}&requiredXP=${requiredXP}`;

    try {

      const response =
        await axios.get(
          apiUrl,
          {
            responseType:
              "stream"
          }
        );

      return api.sendMessage(

        {
          body:
`╭───────────────⭓
│ 📊 USER RANK
├───────────────⭔
│ 👤 ${userData.name}
│
│ 🆙 Level:
│ ${userData.level}
│
│ 🏅 Rank:
│ ${userData.rankName}
│
│ ✨ XP:
│ ${userData.xp}/${requiredXP}
│
│ 💬 Messages:
│ ${userData.messages}
╰───────────────⭓`,

          attachment:
            response.data
        },

        threadID,
        messageID
      );

    } catch {

      return api.sendMessage(

`╭───────────────⭓
│ 📊 USER RANK
├───────────────⭔
│ 👤 ${userData.name}
│
│ 🆙 Level:
│ ${userData.level}
│
│ 🏅 Rank:
│ ${userData.rankName}
│
│ ✨ XP:
│ ${userData.xp}/${requiredXP}
│
│ 💬 Messages:
│ ${userData.messages}
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

  } catch (e) {

    console.log(
      "RANK CMD ERROR:",
      e
    );
  }
};
