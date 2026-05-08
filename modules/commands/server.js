const axios = require("axios");

module.exports.config = {
  name: "server",
  version: "1.0.0",
  credits: "ChatGPT",
  description: "Show Minecraft server status",
  commandCategory: "minecraft",
  usages: "/server",
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

    // get server data
    const res =
      await axios.get(
        `${FIREBASE_URL}/server.json`
      );

    const data =
      res.data;

    if (!data) {

      return api.sendMessage(
        "❌ No server data found.",
        threadID,
        messageID
      );
    }

    const status =
      data.status || "offline";

    const tps =
      data.tps || 0;

    const players =
      data.online_players || 0;

    api.sendMessage(

`📡 Minecraft Server Status

🟢 Status: ${status}
👥 Online Players: ${players}
⚡ TPS: ${tps}`,

      threadID,
      messageID
    );

  } catch (e) {

    console.log(
      "SERVER CMD ERROR:",
      e.message
    );

    api.sendMessage(
      "❌ Failed to get server data.",
      threadID,
      messageID
    );
  }
};
