const fs = require("fs-extra");
const axios = require("axios");

module.exports.config = {
  name: "resend",
  version: "3.1.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + Edited",
  description: "Resend unsent messages with attachments",
  usePrefix: true,
  commandCategory: "general",
  usages: "resend",
  cooldowns: 0,
  hide: true,
  dependencies: {
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

    // Ignore bot messages
    if (senderID == global.data.botID)
      return;

    // Thread settings
    const threadData =
      (await Threads.getData(threadID)).data || {};

    // Resend OFF
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

    // DETECT UNSEND
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
`🚨 MESSAGE UNSENT

👤 ${name}

💬 ${msgData.body || "No text"}`,
        threadID
      );
    }

    // WITH ATTACHMENTS
    let attachments = [];

    for (let i = 0; i < msgData.attachments.length; i++) {

      try {

        const file =
          msgData.attachments[i];

        if (!file.url)
          continue;

        const ext =
          file.type === "photo"
            ? "jpg"
            : file.type === "video"
            ? "mp4"
            : file.type === "audio"
            ? "mp3"
            : "bin";

        const filePath =
          `${__dirname}/cache/${Date.now()}_${i}.${ext}`;

        // DOWNLOAD STREAM
        const response = await axios({
          url: file.url,
          method: "GET",
          responseType: "stream"
        });

        // SAVE FILE
        await new Promise((resolve, reject) => {

          const writer =
            fs.createWriteStream(filePath);

          response.data.pipe(writer);

          writer.on("finish", resolve);
          writer.on("error", reject);

        });

        attachments.push(
          fs.createReadStream(filePath)
        );

      } catch (err) {

        console.log(
          "Attachment Error:",
          err.message
        );

      }
    }

    // SEND RESEND MESSAGE
    return api.sendMessage(
      {
        body:
`🚨 MESSAGE UNSENT

👤 ${name}

📎 ${attachments.length} Attachment(s)

💬 ${msgData.body || "No text"}`,

        attachment: attachments
      },
      threadID
    );

  } catch (e) {

    console.log(
      "RESEND ERROR:",
      e.message
    );

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

  await Threads.setData(
    threadID,
    { data }
  );

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
