module.exports.config = {
    name: "autoIp",
    version: "1.0.0",
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
        messageID
    } = event;

    if (!body) return;

    const text =
        body.toLowerCase().trim();

    // detect exact "ip" only
    if (text !== "ip")
        return;

    return api.sendMessage(
`━━━━━━━━━━━━━━━
BARKADA CRAFT SMP

📡 SERVER IPs

🇵🇭 PH SERVER
┃ JAVA IP: barkadacraftsmp.ph1-mczie.fun:4090
┃ BEDROCK IP: barkadacraftsmp.ph1-mczie.fun
┃ PORT: 4090

🇸🇬 SG SERVER
┃ JAVA IP: barkadacraftsmp.sg1-mczie.fun:4090
┃ BEDROCK IP: barkadacraftsmp.sg1-mczie.fun
┃ PORT: 4090
━━━━━━━━━━━━━━━`,
        threadID,
        messageID
    );
};

module.exports.run = async function () {};
