module.exports.config = {
  name: "resend",
  version: "2.1.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + Edited",
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
  client,
  Users
}) {

  const request =
    global.nodemodule["request"];

  const axios =
    global.nodemodule["axios"];

  const {
    writeFileSync,
    createReadStream,
    unlinkSync,
    existsSync,
    mkdirSync
  } = global.nodemodule["fs-extra"];

  let {
    messageID,
    senderID,
    threadID,
    body: content
  } = event;

  if (!global.logMessage)
    global.logMessage = new Map();

  if (!global.data.botID)
    global.data.botID =
      api.getCurrentUserID();

  const thread =
    global.data.threadData.get(
      parseInt(threadID)
    ) || {};

  // resend off
  if (
    typeof thread["resend"] !=
      "undefined" &&
    thread["resend"] == false
  ) return;

  // ignore bot
  if (
    senderID ==
    global.data.botID
  ) return;

  // create cache folder
  const cachePath =
    __dirname + `/cache`;

  if (!existsSync(cachePath))
    mkdirSync(cachePath, {
      recursive: true
    });

  // save messages
  if (
    event.type !=
    "message_unsend"
  ) {

    global.logMessage.set(
      messageID,
      {
        msgBody: content || "",
        attachment:
          event.attachments || [],
      }
    );

    return;
  }

  // unsend detect
  if (
    event.type ==
    "message_unsend"
  ) {

    var getMsg =
      global.logMessage.get(
        messageID
      );

    if (!getMsg)
      return;

    let name =
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
    else {

      let num = 0;

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

      let removeFiles = [];

      for (var i of getMsg.attachment) {

        try {

          num += 1;

          let ext = "jpg";

          if (
            i.type == "video"
          ) ext = "mp4";

          else if (
            i.type == "audio"
          ) ext = "mp3";

          else if (
            i.type ==
            "animated_image"
          ) ext = "gif";

          else if (
            i.type == "photo"
          ) ext = "jpg";

          var path =
            __dirname +
            `/cache/${Date.now()}_${num}.${ext}`;

          var data =
            (
              await axios.get(
                i.url,
                {
                  responseType:
                    "arraybuffer"
                }
              )
            ).data;

          writeFileSync(
            path,
            Buffer.from(data)
          );

          removeFiles.push(path);

          msg.attachment.push(
            createReadStream(path)
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
        threadID,
        () => {

          for (const file of removeFiles) {

            try {

              unlinkSync(file);

            } catch (e) {}
          }
        }
      );
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

  var data =
    (
      await Threads.getData(
        threadID
      )
    ).data;

  if (
    typeof data["resend"] ==
      "undefined" ||
    data["resend"] == false
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
      data["resend"] == true
        ? "ON ✅"
        : "OFF ❌"
    }`,
    threadID,
    messageID
  );
};
