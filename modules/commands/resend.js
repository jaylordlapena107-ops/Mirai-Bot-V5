const fs = require("fs-extra");
const axios = require("axios");
const request = require("request");

module.exports.config = {
  name: "resend",
  version: "3.0.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + Edited",
  description: "Resend unsent messages",
  usePrefix: true,
  commandCategory: "general",
  usages: "resend",
  cooldowns: 0,
  hide: true,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: ""
  }
};

module.exports.handleEvent = async function ({
  event,
  api,
  Users,
  Threads
}) {

  try {

    const {
      messageID,
      senderID,
      threadID,
      body
    } = event;

    if (!global.logMessage)
      global.logMessage = new Map();

    if (!global.data.botID)
      global.data.botID = api.getCurrentUserID();

    // ignore bot messages
    if (senderID == global.data.botID)
      return;

    // thread settings
    const threadData =
      (await Threads.getData(threadID)).data || {};

    // resend off
    if (threadData.resend === false)
      return;

    // SAVE MESSAGE
    if (event.type !== "message_unsend") {

      global.logMessage.set(messageID, {
        body: body || "",
        attachments: event.attachments || [],
        senderID
      });

      return;
    }

    // UNSEND DETECTED
    const msgData =
      global.logMessage.get(messageID);

    if (!msgData)
      return;

    const name =
      await Users.getNameUser(senderID);

    // NO ATTACHMENT
    if (
      !msgData.attachments ||
      msgData.attachments.length === 0
    ) {

      return api.sendMessage(
        `🚨 MESSAGE UNSENT\n\n👤 ${name}\n\n💬 ${msgData.body || "No text"}`,
        threadID
      );
    }

    // WITH ATTACHMENT
    let files = [];

    for (let i = 0; i < msgData.attachments.length; i++) {

      try {

        const attachment =
          msgData.attachments[i];

        if (!attachment.url)
          continue;

        const ext =
          attachment.type === "photo"
            ? "jpg"
            : attachment.type === "video"
            ? "mp4"
            : attachment.type === "audio"
            ? "mp3"
            : "bin";

        const path =
          __dirname +
          `/cache/${Date.now()}_${i}.${ext}`;

        const response =
          await axios.get(
            attachment.url,
            {
              responseType: "arraybuffer"
            }
          );

        fs.writeFileSync(
          path,
          Buffer.from(response.data)
        );

        files.push(
          fs.createReadStream(path)
        );

      } catch (e) {
        console.log(e);
      }
    }

    return api.sendMessage(
      {
        body:
`🚨 MESSAGE UNSENT

👤 ${name}

📎 ${files.length} Attachment(s)

💬 ${msgData.body || "No text"}`,

        attachment: files
      },
      threadID
    );

  } catch (e) {

    console.log("RESEND ERROR:", e);

  }
};

module.exports.run = async function ({
  api,
  event,
  Threads
}) {

  const {
    threadID,
    messageID
  } = event;

  const data =
    (await Threads.getData(threadID)).data || {};

  if (
    typeof data.resend === "undefined" ||
    data.resend === false
  ) {
    data.resend = true;
  } else {
    data.resend = false;
  }

  await Threads.setData(threadID, {
    data
  });

  global.data.threadData.set(
    parseInt(threadID),
    data
  );

  return api.sendMessage(
    `✅ Resend is now ${
      data.resend ? "ON" : "OFF"
    }`,
    threadID,
    messageID
  );
};
