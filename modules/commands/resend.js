const fs = require("fs-extra");
const axios = require("axios");
const request = require("request");
const moment = require("moment-timezone");

module.exports.config = {
  name: "resend",
  version: "4.0.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + ChatGPT",
  description: "Resend unsent messages with attachment",
  usePrefix: true,
  commandCategory: "utility",
  usages: "resend",
  cooldowns: 0,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: "",
    "moment-timezone": ""
  }
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
    body,
    attachments,
    type
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

  // get name
  let senderName =
    global.data.userName.get(senderID);

  if (!senderName) {

    const userInfo =
      await api.getUserInfo(senderID);

    senderName =
      Object.values(userInfo)[0]?.name ||
      "Friend";

    global.data.userName.set(
      senderID,
      senderName
    );
  }

  // save normal messages
  if (type !== "message_unsend") {

    global.logMessage.set(messageID, {

      msgBody: body || "No text",

      attachment:
        attachments || [],

      senderName,

      senderID,

      timeSent:
        moment()
          .tz("Asia/Manila")
          .format("hh:mm A | MMM DD YYYY")
    });

    return;
  }

  // detect unsend
  const getMsg =
    global.logMessage.get(messageID);

  if (!getMsg)
    return;

  const unsentTime =
    moment()
      .tz("Asia/Manila")
      .format("hh:mm A | MMM DD YYYY");

  // no attachment
  if (
    !getMsg.attachment ||
    getMsg.attachment.length === 0
  ) {

    return api.sendMessage({
      body:
`🚨 MESSAGE UNSENT

👤 Name: ${getMsg.senderName}

💬 Message:
${getMsg.msgBody}

⏰ Sent:
${getMsg.timeSent}

🗑️ Unsent:
${unsentTime}`,

      mentions: [{
        tag: getMsg.senderName,
        id: getMsg.senderID,
        fromIndex: 0
      }]
    },
    threadID,
    null,
    messageID);
  }

  // with attachment
  let msg = {

    body:
`🚨 MESSAGE UNSENT

👤 Name: ${getMsg.senderName}

💬 Message:
${getMsg.msgBody}

📎 Attachments:
${getMsg.attachment.length}

⏰ Sent:
${getMsg.timeSent}

🗑️ Unsent:
${unsentTime}`,

    attachment: [],

    mentions: [{
      tag: getMsg.senderName,
      id: getMsg.senderID,
      fromIndex: 0
    }]
  };

  let filePaths = [];
  let num = 0;

  for (const i of getMsg.attachment) {

    try {

      num++;

      const getURL =
        await request.get(i.url);

      const pathname =
        getURL.uri.pathname;

      let ext = "jpg";

      if (i.type === "photo")
        ext = "jpg";

      else if (i.type === "video")
        ext = "mp4";

      else if (i.type === "audio")
        ext = "mp3";

      else if (i.type === "animated_image")
        ext = "gif";

      else if (pathname.includes("."))
        ext = pathname.substring(
          pathname.lastIndexOf(".") + 1
        );

      const pathFile =
        __dirname +
        `/cache/${Date.now()}_${num}.${ext}`;

      const data =
        (
          await axios.get(i.url, {
            responseType: "arraybuffer"
          })
        ).data;

      fs.writeFileSync(
        pathFile,
        Buffer.from(data)
      );

      filePaths.push(pathFile);

      msg.attachment.push(
        fs.createReadStream(pathFile)
      );

    } catch (e) {

      console.log(e);
    }
  }

  api.sendMessage(
    msg,
    threadID,
    () => {

      for (const path of filePaths) {

        if (fs.existsSync(path))
          fs.unlinkSync(path);
      }
    },
    messageID
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
    typeof data.resend === "undefined" ||
    data.resend === false
  )

    data.resend = true;

  else

    data.resend = false;

  await Threads.setData(
    parseInt(threadID),
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
