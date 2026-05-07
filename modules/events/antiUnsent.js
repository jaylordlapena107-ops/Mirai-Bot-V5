const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

const CACHE_PATH = path.join(__dirname, "cache", "antiunsent");

fs.ensureDirSync(CACHE_PATH);

module.exports.config = {
    name: "antiunsent",
    eventType: ["message", "message_unsend"],
    version: "2.0.0",
    credits: "ChatGPT",
    description: "Resend unsent messages with attachments"
};

// SAVE MESSAGE
module.exports.handleEvent = async function({ event }) {

    try {

        if (!global.data.unsendCache)
            global.data.unsendCache = {};

        if (event.type !== "message") return;

        const attachments = [];

        if (event.attachments && event.attachments.length > 0) {

            for (const att of event.attachments) {

                try {

                    const ext =
                        att.type === "photo" ? "jpg" :
                        att.type === "video" ? "mp4" :
                        att.type === "audio" ? "mp3" :
                        att.type === "animated_image" ? "gif" :
                        "bin";

                    const filePath = path.join(
                        CACHE_PATH,
                        `${event.messageID}_${Date.now()}.${ext}`
                    );

                    const response = await axios({
                        url: att.url,
                        method: "GET",
                        responseType: "stream"
                    });

                    const writer = fs.createWriteStream(filePath);

                    response.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on("finish", resolve);
                        writer.on("error", reject);
                    });

                    attachments.push(filePath);

                } catch (e) {
                    console.log(e);
                }
            }
        }

        global.data.unsendCache[event.messageID] = {
            body: event.body || "",
            senderID: event.senderID,
            timestamp: Date.now(),
            attachments
        };

    } catch (e) {
        console.log(e);
    }
};

// UNSEND DETECT
module.exports.run = async function({ api, event, Users }) {

    try {

        const messageData =
            global.data.unsendCache?.[event.messageID];

        if (!messageData) return;

        const senderID = messageData.senderID;

        const name =
            await Users.getNameUser(senderID);

        const sentTime = moment(messageData.timestamp)
            .tz("Asia/Manila")
            .format("hh:mm A | MMM DD YYYY");

        const unsentTime = moment()
            .tz("Asia/Manila")
            .format("hh:mm A | MMM DD YYYY");

        const attachmentStreams = [];

        for (const filePath of messageData.attachments) {

            if (fs.existsSync(filePath)) {

                attachmentStreams.push(
                    fs.createReadStream(filePath)
                );
            }
        }

        let body =
`🚨 MESSAGE UNSENT

👤 Name: ${name}

💬 Message:
${messageData.body || "No text message"}

⏰ Sent:
${sentTime}

🗑️ Unsent:
${unsentTime}`;

        api.sendMessage({
            body,
            attachment:
                attachmentStreams.length > 0
                    ? attachmentStreams
                    : undefined
        }, event.threadID);

    } catch (e) {
        console.log(e);
    }
};
