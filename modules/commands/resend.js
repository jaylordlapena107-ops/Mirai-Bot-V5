module.exports.config = {
  name: "resend",
  version: "4.0.0",
  hasPermssion: 1,
  credits: "Thọ & Edited",
  description: "Resend unsent text messages",
  usePrefix: true,
  commandCategory: "general",
  usages: "resend",
  cooldowns: 0,
  hide: true
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

    // SAVE TEXT MESSAGE ONLY
    if (
      event.type !== "message_unsend" &&
      body
    ) {

      global.logMessage.set(messageID, {
        body,
        senderID
      });

      return;
    }

    // DETECT UNSEND
    if (event.type === "message_unsend") {

      const msgData =
        global.logMessage.get(messageID);

      if (!msgData)
        return;

      const name =
        await Users.getNameUser(senderID);

      return api.sendMessage(
`🚨 MESSAGE UNSENT

👤 ${name}

💬 ${msgData.body}`,
        threadID
      );
    }

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
