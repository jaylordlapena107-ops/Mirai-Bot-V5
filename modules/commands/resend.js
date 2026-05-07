const fs = require("fs-extra");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "resend",
  version: "6.0.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + ChatGPT",
  description: "Resend unsent messages with attachments",
  usePrefix: true,
  commandCategory: "utility",
  usages: "resend",
  cooldowns: 0,
  dependencies: {
    "fs-extra": "",
    axios: "",
    "moment-timezone": ""
  },
};

module.exports.handleEvent = async function ({
  event,
  api,
  Threads
}) {

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

  // resend status
  const threadData =
    (await Threads.getData(threadID)).data || {};

  if (threadData.resend === false)
    return;

  // get sender name
  let senderName =
    global.data.userName.get(senderID);

  if (!senderName) {

    const userInfo =
      await api.getUserInfo(senderID);

    senderName =
      Object.values(userInfo)[0]?.name ||
      "Unknown User";

    global.data.userName.set(
      senderID,
      senderName
    );
  }

  // SAVE NORMAL MESSAGE
  if (event.type !== "message_unsend") {

    global.logMessage.set(messageID, {

      senderID,
      senderName,

      body:
        body || "No text",

      attachments:
        event.attachments || [],

      timeSent:
        moment()
          .tz("Asia/Manila")
          .format("hh:mm A | MMM DD YYYY")
    });

    return;
  }

  // UNSEND DETECTED
  const msgData =
    global.logMessage.get(messageID);

  if (!msgData)
    return;

  const unsentTime =
    moment()
      .tz("Asia/Manila")
      .format("hh:mm A | MMM DD YYYY");

  let attachments = [];

  // DOWNLOAD ATTACHMENTS
  for (let i = 0; i < msgData.attachments.length; i++) {

    try {

      const file =
        msgData.attachments[i];

      let ext = "dat";

      if (file.type === "photo")
        ext = "jpg";

      else if (file.type === "video")
        ext = "mp4";

      else if (file.type === "audio")
        ext = "mp3";

      else if (file.type === "animated_image")
        ext = "gif";

      else if (file.type === "file")
        ext = "bin";

      const filePath =
        __dirname +
        `/cache/resend_${Date.now()}_${i}.${ext}`;

      // STREAM DOWNLOAD
      const response = await axios({
        url: file.url,
        method: "GET",
        responseType: "stream"
      });

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

    } catch (e) {

      console.log(
        "[RESEND ERROR]",
        e.message
      );
    }
  }

  // SEND MESSAGE
  return api.sendMessage({

    attachment:
      attachments.length > 0
        ? attachments
        : undefined,

    body:
`🚨 MESSAGE UNSENT

👤 Name: ${msgData.senderName}

💬 Message:
${msgData.body}

📎 Attachments:
${msgData.attachments.length}

⏰ Sent:
${msgData.timeSent}

🗑️ Unsent:
${unsentTime}`,

    mentions: [{
      tag: msgData.senderName,
      id: msgData.senderID,
      fromIndex: 0
    }]

  }, threadID);
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
    typeof data.resend === "undefined"
  ) {
    data.resend = true;
  }

  else {
    data.resend = !data.resend;
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
    `Resend is now ${
      data.resend
        ? "ON ✅"
        : "OFF ❌"
    }`,
    threadID,
    messageID
  );
};
