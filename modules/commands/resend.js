const fs = require("fs-extra");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "resend",
  version: "4.0.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + ChatGPT",
  description: "Resends unsent messages with attachments",
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

  // ignore bot
  if (senderID == global.data.botID)
    return;

  // check if resend enabled
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

  // save messages
  if (event.type !== "message_unsend") {

    global.logMessage.set(messageID, {

      senderID,
      senderName,

      body: body || "No text",

      attachments:
        event.attachments || [],

      timeSent:
        moment()
          .tz("Asia/Manila")
          .format("hh:mm A | MMM DD YYYY")
    });

    return;
  }

  // detect unsend
  const msgData =
    global.logMessage.get(messageID);

  if (!msgData)
    return;

  const unsentTime =
    moment()
      .tz("Asia/Manila")
      .format("hh:mm A | MMM DD YYYY");

  let sendMsg = {

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

    attachment: [],

    mentions: [{
      tag: msgData.senderName,
      id: msgData.senderID,
      fromIndex: 0
    }]
  };

  // download attachments
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

      const response =
        await axios.get(file.url, {
          responseType: "arraybuffer"
        });

      fs.writeFileSync(
        filePath,
        Buffer.from(response.data)
      );

      sendMsg.attachment.push(
        fs.createReadStream(filePath)
      );

    } catch (e) {
      console.log(
        "[RESEND ATTACHMENT ERROR]",
        e.message
      );
    }
  }

  return api.sendMessage(
    sendMsg,
    threadID
  );
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
