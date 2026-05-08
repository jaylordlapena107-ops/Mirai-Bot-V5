const axios = require("axios");
const {
  getData,
  setData
} = require("../../database.js");

module.exports.config = {
  name: "minecraftchat",
  version: "5.0.0",
  credits: "ChatGPT",
  description:
    "Minecraft <-> Facebook Chat Bridge",
  commandCategory: "system",
  usages:
    "/minecraftchat on | off",
  cooldowns: 3
};

// ── FIREBASE URL ────────────────────
const FIREBASE_URL =
  "https://mybot-d79df-default-rtdb.asia-southeast1.firebasedatabase.app";

// ── CACHE ───────────────────────────
let lastMessageID = null;

// ── COMMAND ─────────────────────────
module.exports.run =
async function ({
  api,
  event,
  args
}) {

  const {
    threadID,
    senderID,
    messageID
  } = event;

  const sub =
    (args[0] || "")
    .toLowerCase();

  let isAdmin = false;

  try {

    const info =
      await api.getThreadInfo(
        threadID
      );

    isAdmin =
      info.adminIDs.some(
        a => a.id == senderID
      );

  } catch (e) {

    return api.sendMessage(
      "❌ Failed to get group info.",
      threadID,
      messageID
    );
  }

  // ── ADMIN CHECK ───────────────────
  if (!isAdmin) {

    return api.sendMessage(
      "❌ Only GC admins can use this command.",
      threadID,
      messageID
    );
  }

  // ── INVALID ───────────────────────
  if (
    sub !== "on" &&
    sub !== "off"
  ) {

    return api.sendMessage(
      "📌 Usage:\n/minecraftchat on\n/minecraftchat off",
      threadID,
      messageID
    );
  }

  // ── SAVE ──────────────────────────
  const enabled =
    sub === "on";

  await setData(
    `minecraftchat/${threadID}`,
    {
      enabled
    }
  );

  return api.sendMessage(

    enabled
      ? "✅ Minecraft chat bridge enabled."
      : "❌ Minecraft chat bridge disabled.",

    threadID,
    messageID
  );
};

// ── FB TO MC ───────────────────────
module.exports.handleEvent =
async function ({
  api,
  event
}) {

  try {

    const {
      threadID,
      senderID,
      body
    } = event;

    // ignore bot messages
    if (
      senderID ==
      api.getCurrentUserID()
    ) return;

    // ignore empty
    if (!body)
      return;

    // ignore commands
    if (
      body.startsWith("/")
    ) return;

    // check enabled
    const settings =
      await getData(
        `minecraftchat/${threadID}`
      );

    if (
      !settings ||
      !settings.enabled
    ) return;

    // get user info
    const userInfo =
      await api.getUserInfo(
        senderID
      );

    const name =
      userInfo[senderID]
        ?.name || "Facebook";

    // ── SEND TO FIREBASE ───────────
    await axios.post(

      `${FIREBASE_URL}/chat1.json`,

      {
        uid: senderID,
        name: name,
        message: body,
        source: "fb",
        time: Date.now()
      }
    );

    // ── LIMIT CHAT1 TO 20 ──────────
    try {

      const chatRes =
        await axios.get(
          `${FIREBASE_URL}/chat1.json`
        );

      const chatData =
        chatRes.data;

      if (chatData) {

        const keys =
          Object.keys(chatData);

        // sort oldest -> newest
        const sorted =
          keys.sort((a, b) => {

            const timeA =
              chatData[a]?.time || 0;

            const timeB =
              chatData[b]?.time || 0;

            return timeA - timeB;
          });

        // delete old messages
        if (sorted.length > 20) {

          const removeCount =
            sorted.length - 20;

          for (
            let i = 0;
            i < removeCount;
            i++
          ) {

            const oldKey =
              sorted[i];

            await axios.delete(
              `${FIREBASE_URL}/chat1/${oldKey}.json`
            );
          }
        }
      }

    } catch (e) {

      console.log(
        "CHAT CLEANUP ERROR:",
        e.message
      );
    }

  } catch (e) {

    console.log(
      "FB TO MC ERROR:",
      e.message
    );
  }
};

// ── START LISTENER ──────────────────
module.exports.onLoad =
function ({ api }) {

  console.log(
    "Minecraft Chat Listener Started"
  );

  setInterval(
    async () => {

      try {

        // ── GET CHAT DATA ───────────
        const res =
          await axios.get(
            `${FIREBASE_URL}/chat1.json`
          );

        const data =
          res.data;

        if (!data)
          return;

        const keys =
          Object.keys(data);

        if (keys.length === 0)
          return;

        // latest message
        const latestKey =
          keys[keys.length - 1];

        // anti duplicate
        if (
          latestKey ===
          lastMessageID
        ) return;

        lastMessageID =
          latestKey;

        const msgData =
          data[latestKey];

        if (!msgData)
          return;

        const name =
          msgData.name ||
          "Unknown";

        const message =
          msgData.message ||
          "No Message";

        const source =
          msgData.source ||
          "unknown";

        // MC only
        if (
          source !== "mc"
        ) return;

        // get enabled threads
        const settings =
          await getData(
            `minecraftchat`
          );

        if (!settings)
          return;

        const threadIDs =
          Object.keys(settings);

        for (const threadID of threadIDs) {

          // enabled check
          if (
            !settings[threadID] ||
            !settings[threadID]
              .enabled
          ) continue;

          api.sendMessage(

`[Minecraft]
${name}: ${message}`,

            threadID
          );
        }

      } catch (e) {

        console.log(
          "MINECRAFT CHAT ERROR:",
          e.message
        );
      }

    },

    1000
  );
};
