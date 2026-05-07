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
  Users,
  Threads
}) {

  const request =
    global.nodemodule["request"];

  const axios =
    global.nodemodule["axios"];

  const {
    writeFileSync,
    createReadStream
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

  // thread settings
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

  // save message
  if (
    event.type !=
    "message_unsend"
  ) {

    global.logMessage.set(
      messageID,
      {
        msgBody:
          content || "",

        attachment:
          event.attachments || [],
      }
    );
  }

  // detect unsend
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
      getMsg.attachment[0] ==
      undefined
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

        attachment: [],

        mentions: [{
          tag: name,
          id: senderID
        }]
      };

      for (var i of getMsg.attachment) {

        try {

          num += 1;

          var getURL =
            await request.get(
              i.url
            );

          var pathname =
            getURL.uri.pathname;

          var ext =
            pathname.substring(
              pathname.lastIndexOf(".") + 1
            );

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
            Buffer.from(
              data,
              "utf-8"
            )
          );

          msg.attachment.push(
            createReadStream(path)
          );

        } catch (e) {

          console.log(e);
        }
      }

      api.sendMessage(
        msg,
        threadID
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
