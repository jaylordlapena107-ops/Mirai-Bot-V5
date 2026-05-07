module.exports.config = {
  name: "resend",
  version: "2.2.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + Fixed",
  description: "Resends Messages",
  usePrefix: true,
  commandCategory: "general",
  usages: "resend",
  cooldowns: 0,
  hide: true,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: ""
  },
};

module.exports.handleEvent = async function ({
  event,
  api,
  Users,
  Threads
}) {

  const request =
    global.nodemodule["request"];

  const axios =
    global.nodemodule["axios"];

  const {
    writeFileSync,
    createReadStream,
    existsSync,
    mkdirSync
  } = global.nodemodule["fs-extra"];

  const {
    messageID,
    senderID,
    threadID,
    body
  } = event;

  if (!global.logMessage)
    global.logMessage = new Map();

  if (!global.data.botID)
    global.data.botID =
      api.getCurrentUserID();

  // ignore bot
  if (
    senderID ==
    global.data.botID
  ) return;

  // thread data
  const threadData =
    (
      await Threads.getData(
        threadID
      )
    ).data || {};

  // resend off
  if (
    typeof threadData.resend !=
      "undefined" &&
    threadData.resend == false
  ) return;

  // create cache folder
  const cachePath =
    __dirname + "/cache";

  if (!existsSync(cachePath))
    mkdirSync(cachePath, {
      recursive: true
    });

  // SAVE MESSAGE
  if (
    event.type !=
    "message_unsend"
  ) {

    global.logMessage.set(
      messageID,
      {
        msgBody:
          body || "",

        attachment:
          event.attachments || []
      }
    );

    return;
  }

  // UNSEND
  if (
    event.type ==
    "message_unsend"
  ) {

    const getMsg =
      global.logMessage.get(
        messageID
      );

    if (!getMsg)
      return;

    const name =
      await Users.getNameUser(
        senderID
      );

    // no attachment
    if (
      !getMsg.attachment ||
      getMsg.attachment.length ==
        0
    ) {

      return api.sendMessage(
`🚨 MESSAGE UNSENT

👤 Name: ${name}

💬 Content:
${getMsg.msgBody || "No text"}`,
        threadID
      );
    }

    // with attachment
    let msg = {

      body:
`🚨 MESSAGE UNSENT

👤 Name: ${name}

📎 Attachments:
${getMsg.attachment.length}

💬 Content:
${getMsg.msgBody || "No text"}`,

      attachment: []
    };

    let num = 0;

    for (const file of getMsg.attachment) {

      try {

        num++;

        const getURL =
          await request.get(
            file.url
          );

        const pathname =
          getURL.uri.pathname;

        const ext =
          pathname.substring(
            pathname.lastIndexOf(".") + 1
          );

        const filePath =
          __dirname +
          `/cache/${Date.now()}_${num}.${ext}`;

        const data =
          (
            await axios.get(
              file.url,
              {
                responseType:
                  "arraybuffer"
              }
            )
          ).data;

        writeFileSync(
          filePath,
          Buffer.from(data)
        );

        msg.attachment.push(
          createReadStream(filePath)
        );

      } catch (e) {

        console.log(
          "[RESEND ERROR]",
          e.message
        );
      }
    }

    return api.sendMessage(
      msg,
      threadID
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
    (
      await Threads.getData(
        threadID
      )
    ).data || {};

  if (
    typeof data.resend ==
      "undefined" ||
    data.resend == false
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
