const fs = require("fs-extra");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "resend",
  version: "7.0.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + ChatGPT",
  description: "Anti unsend with image/video support",
  usePrefix: true,
  commandCategory: "utility",
  usages: "resend",
  cooldowns: 0,
  dependencies: {
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
    type,
    attachments
  } = event;

  if (!global.logMessage)
    global.logMessage = new Map();

  if (!global.data.botID)
    global.data.botID = api.getCurrentUserID();

  // ignore bot
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
      "Friend";

    global.data.userName.set(
      senderID,
      senderName
    );
  }

  // SAVE NORMAL MESSAGE
  if (type !== "message_unsend") {

    let savedAttachments = [];

    // save attachment instantly
    if (
      attachments &&
      attachments.length > 0
    ) {

      let num = 0;

      for (const att of attachments) {

        try {

          console.log(
            "[ATTACHMENT]",
            att
          );

          num++;

          const url =
            att.playableUrl ||
            att.largePreviewUrl ||
            att.previewUrl ||
            att.url;

          if (!url)
            continue;

          let ext = "jpg";

          if (att.type === "photo")
            ext = "jpg";

          else if (att.type === "video")
            ext = "mp4";

          else if (att.type === "audio")
            ext = "mp3";

          else if (
            att.type === "animated_image"
          )
            ext = "gif";

          else if (
            att.type === "file"
          )
            ext = "bin";

          const pathFile =
            __dirname +
            `/cache/${messageID}_${num}.${ext}`;

          const data =
            (
              await axios.get(url, {
                responseType: "arraybuffer"
              })
            ).data;

          fs.writeFileSync(
            pathFile,
            Buffer.from(data)
          );

          savedAttachments.push(
            pathFile
          );

          console.log(
            "[ATTACHMENT SAVED]",
            pathFile
          );

        } catch (e) {

          console.log(
            "[SAVE ERROR]",
            e.message
          );
        }
      }
    }

    // save message
    global.logMessage.set(messageID, {

      msgBody:
        body || "No text",

      attachment:
        savedAttachments,

      senderName,

      senderID,

      timeSent:
        moment()
          .tz("Asia/Manila")
          .format(
            "hh:mm A | MMM DD YYYY"
          )
    });

    return;
  }

  // DETECT UNSEND
  const getMsg =
    global.logMessage.get(messageID);

  if (!getMsg)
    return;

  const unsentTime =
    moment()
      .tz("Asia/Manila")
      .format(
        "hh:mm A | MMM DD YYYY"
      );

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

  // attach saved files
  for (const filePath of getMsg.attachment) {

    try {

      if (
        fs.existsSync(filePath)
      ) {

        msg.attachment.push(
          fs.createReadStream(filePath)
        );
      }

    } catch (e) {

      console.log(
        "[READ ERROR]",
        e.message
      );
    }
  }

  return api.sendMessage(
    msg,
    threadID,
    null,
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
    (await Threads.getData(threadID))
      .data || {};

  if (
    typeof data.resend ===
      "undefined" ||
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
