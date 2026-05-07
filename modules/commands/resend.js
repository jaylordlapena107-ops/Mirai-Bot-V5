const fs = global.nodemodule["fs-extra"];
const axios = global.nodemodule["axios"];
const request = global.nodemodule["request"];
const moment = require("moment-timezone");

module.exports.config = {
  name: "resend",
  version: "3.0.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + ChatGPT",
  description: "Resends unsent messages with time",
  usePrefix: true,
  commandCategory: "utility",
  usages: "resend",
  cooldowns: 0,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: "",
    "moment-timezone": ""
  },
};

module.exports.handleEvent = async function ({ event, api, Users, Threads }) {

  let {
    messageID,
    senderID,
    threadID,
    body: content
  } = event;

  if (!global.logMessage)
    global.logMessage = new Map();

  if (!global.data.botID)
    global.data.botID = api.getCurrentUserID();

  // skip bot messages
  if (senderID == global.data.botID)
    return;

  // check resend status
  const threadData =
    (await Threads.getData(threadID)).data || {};

  if (threadData.resend === false)
    return;

  // get sender name
  let name = global.data.userName.get(senderID);

  if (!name) {

    const userInfo =
      await api.getUserInfo(senderID);

    name =
      Object.values(userInfo)[0]?.name ||
      "Friend";

    global.data.userName.set(senderID, name);
  }

  // save normal messages
  if (event.type !== "message_unsend") {

    global.logMessage.set(messageID, {

      msgBody: content || "",

      attachment:
        event.attachments || [],

      senderName: name,

      senderID,

      timeSent:
        moment()
          .tz("Asia/Manila")
          .format("hh:mm A | MMM DD YYYY")
    });
  }

  // detect unsend
  if (event.type === "message_unsend") {

    const getMsg =
      global.logMessage.get(messageID);

    if (!getMsg)
      return;

    const unsentTime =
      moment()
        .tz("Asia/Manila")
        .format("hh:mm A | MMM DD YYYY");

    const senderName =
      getMsg.senderName || "Friend";

    // no attachment
    if (
      !getMsg.attachment ||
      getMsg.attachment.length === 0
    ) {

      return api.sendMessage({
        body:
`🚨 MESSAGE UNSENT

👤 Name: ${senderName}

💬 Message:
${getMsg.msgBody || "No text"}

⏰ Sent:
${getMsg.timeSent}

🗑️ Unsent:
${unsentTime}`,

        mentions: [{
          tag: senderName,
          id: getMsg.senderID,
          fromIndex: 0
        }]
      }, threadID);
    }

    // with attachment
    else {

      let num = 0;

      let msg = {

        body:
`🚨 MESSAGE UNSENT

👤 Name: ${senderName}

📎 Attachments:
${getMsg.attachment.length}

💬 Message:
${getMsg.msgBody || "No text"}

⏰ Sent:
${getMsg.timeSent}

🗑️ Unsent:
${unsentTime}`,

        attachment: [],

        mentions: [{
          tag: senderName,
          id: getMsg.senderID,
          fromIndex: 0
        }]
      };

      for (let i of getMsg.attachment) {

        try {

          num += 1;

          const getURL =
            await request.get(i.url);

          const pathname =
            getURL.uri.pathname;

          const ext =
            pathname.substring(
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
            Buffer.from(data, "utf-8")
          );

          msg.attachment.push(
            fs.createReadStream(pathFile)
          );

        } catch (e) {
          console.log(e);
        }
      }

      api.sendMessage(msg, threadID);
    }
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
    (await Threads.getData(threadID)).data;

  if (
    typeof data["resend"] === "undefined" ||
    data["resend"] === false
  )
    data["resend"] = true;

  else
    data["resend"] = false;

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
      data["resend"]
        ? "ON ✅"
        : "OFF ❌"
    }`,
    threadID,
    messageID
  );
};
