module.exports.config = {
    name: "run",
    version: "1.0.2",
    hasPermssion: 3,
    credits: "Quat",
    description: "Run JavaScript code",
    commandCategory: "Admin",
    usages: "[Script]",
    cooldowns: 5,
};

module.exports.run = async ({ api, event, args, Threads, Users, Currencies, models, permssion }) => {
    let r = require;
    const [axios, fs, { log }] = [r('axios'), r('fs'), console];
    const tpo = a => typeof a == "object" && Object.keys(a).length != 0 ? JSON.stringify(a, null, 4) : ['number', 'boolean'].includes(typeof a) ? a.toString() : a;
    const send = a => api.sendMessage(tpo(a), event.threadID, event.messageID);

    try {
        const { sendMessage, editMessage, shareContact } = api;
        const { threadID, messageID, senderID } = event;
        send(await eval(`(async() => { ${args.join(' ')} })()`, {
            api, event, args, Threads, Users, Currencies,
            models, global, permssion,
            log, send,
            axios, fs,
            threadID, messageID, senderID,
            sendMessage
        }, true));
    } catch (e) {
        send(`⚠️ Error: ${e.message}`);
    }
};
