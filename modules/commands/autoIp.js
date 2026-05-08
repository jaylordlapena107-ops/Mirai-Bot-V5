module.exports.config = {
    name: "autoIp",
    version: "1.3.0",
    hasPermssion: 0,
    credits: "ChatGPT",
    description: "Auto reply server IP when someone types ip",
    commandCategory: "Auto",
    usages: "ip",
    cooldowns: 2
};

module.exports.handleEvent = async function ({
    api,
    event
}) {

    const {
        body,
        threadID,
        messageID,
        senderID
    } = event;

    if (!body) return;

    // ignore bot's own messages
    if (
        senderID ==
        api.getCurrentUserID()
    ) return;

    const text =
        body.toLowerCase().trim();

    // detect "ip" only as separate word
    const hasIp =
        /\bip\b/.test(text);

    if (!hasIp)
        return;

    return api.sendMessage(
`━━━━━━━━━━━━━━━
BARKADA CRAFT SMP
📡 SERVER IPs
🎮 JAVA
IP: barkadacraftsmp.hk-mczie.fun:4090

📱 BEDROCK
IP: barkadacraftsmp.hk-mczie.fun
Port: 4090
━━━━━━━━━━━━━━━`,
        threadID,
        messageID
    );
};

module.exports.run = async function () {};
