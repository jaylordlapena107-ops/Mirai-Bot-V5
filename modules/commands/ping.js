const bold = require('../../utils/bold');

module.exports.config = {
    name: "ping",
    version: "1.0.5",
    hasPermssion: 1,
    credits: "Mirai Team",
    description: "Mention all members in the group",
    commandCategory: "Group",
    usages: "[Message]",
    cooldowns: 80
};

module.exports.run = async function({ api, event, args }) {
    try {
        const botID = api.getCurrentUserID();
        var listAFK = global.moduleData["afk"]?.afkList ? Object.keys(global.moduleData["afk"].afkList) : [];
        var listUserID = event.participantIDs.filter(ID => ID != botID && ID != event.senderID && !listAFK.includes(ID));

        var body = args.length ? args.join(" ") : `📣 ${bold('You have been mentioned by the admin!')}`;
        var mentions = [], index = 0;
        for (const idUser of listUserID) {
            body = "‎" + body;
            mentions.push({ id: idUser, tag: "‎", fromIndex: index - 1 });
            index -= 1;
        }
        return api.sendMessage({ body, mentions }, event.threadID, event.messageID);
    } catch (e) {
        console.log(e);
    }
};
