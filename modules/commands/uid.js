const bold = require('../../utils/bold');

module.exports = {
    config: {
        name: "uid",
        version: "1.0.0",
        hasPermssion: 0,
        credits: "Mirai Team",
        description: "Get user ID.",
        commandCategory: "Utilities",
        usages: "[reply / @mention / facebook link]",
        cooldowns: 0,
    },
    run: async function({ api, event, args }) {
        if (event.type === "message_reply") {
            const uid = event.messageReply.senderID;
            return api.sendMessage(
                `🆔 ${bold('User ID')}\n\n📌 ${uid}`,
                event.threadID, event.messageID
            );
        }
        if (!args[0]) {
            return api.sendMessage(
                `🆔 ${bold('Your ID')}\n\n📌 ${event.senderID}`,
                event.threadID, event.messageID
            );
        } else {
            if (args[0].includes(".com/")) {
                try {
                    const res_ID = await api.getUID(args[0]);
                    return api.sendMessage(
                        `🆔 ${bold('User ID')}\n\n📌 ${res_ID}\n🔗 ${args[0]}`,
                        event.threadID, event.messageID
                    );
                } catch (error) {
                    return api.sendMessage(`❌ ${bold('Cannot get UID from this link!')}`, event.threadID, event.messageID);
                }
            } else {
                for (const [key, value] of Object.entries(event.mentions)) {
                    api.sendMessage(`🆔 ${bold(value.replace('@', ''))}: ${key}`, event.threadID);
                }
            }
        }
    },
    handleEvent: async ({ api, event, args }) => {
        if (!event.body) return;
        if (event.body.toLowerCase() === "uid") {
            await module.exports.run({ api, event, args: [] });
        }
    }
};
