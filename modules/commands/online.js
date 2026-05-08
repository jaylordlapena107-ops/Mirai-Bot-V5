const axios = require("axios");

module.exports.config = {
  name: "online",
  version: "1.0.0",
  credits: "ChatGPT",
  description: "Show online Minecraft players",
  commandCategory: "minecraft",
  usages: "/online",
  cooldowns: 3
};

const FIREBASE_URL =
  "https://mybot-d79df-default-rtdb.asia-southeast1.firebasedatabase.app";

module.exports.run =
async function ({
  api,
  event
}) {

  const {
    threadID,
    messageID
  } = event;

  try {

    // get online data
    const res =
      await axios.get(
        `${FIREBASE_URL}/onlinePlayer.json`
      );

    const data =
      res.data;

    if (!data) {

      return api.sendMessage(
        "❌ No online player data found.",
        threadID,
        messageID
      );
    }

    const online =
      data.online || 0;

    const players =
      data.players || [];

    let playerList = "";

    if (players.length === 0) {

      playerList =
        "No players online.";

    } else {

      playerList =
        players
          .map(
            (p, i) =>
              `${i + 1}. ${p}`
          )
          .join("\n");
    }

    api.sendMessage(

`👥 Online Players: ${online}

${playerList}`,

      threadID,
      messageID
    );

  } catch (e) {

    console.log(
      "ONLINE CMD ERROR:",
      e.message
    );

    api.sendMessage(
      "❌ Failed to get online players.",
      threadID,
      messageID
    );
  }
};
