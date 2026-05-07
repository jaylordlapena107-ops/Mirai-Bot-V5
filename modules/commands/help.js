const axios = require('axios');

module.exports.config = {
    name: "help",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "DC-Nam mod by ChatGPT",
    description: "View command list and info",
    commandCategory: "General",
    usages: "[command name / all]",
    cooldowns: 5,
    images: [],
};

async function getIbbDirectUrl(pageUrl) {
    try {
        const { data: html } = await axios.get(pageUrl, { timeout: 5000 });
        const match = html.match(/property="og:image"\s+content="([^"]+)"/);
        if (match && match[1]) return match[1];
    } catch (e) {}
    return null;
}

module.exports.run = async function({ api, event, args }) {

    const { threadID: tid, messageID: mid } = event;

    const type = args[0] ? args[0].toLowerCase() : "";

    let msg = "";
    let array = [];
    let i = 0;

    const cmds = global.client.commands;
    const TIDdata = global.data.threadData.get(tid) || {};

    const prefix = TIDdata.PREFIX || global.config.PREFIX;
    const NameBot = global.config.BOTNAME || "Barkada Bot";
    const version = global.config.version || "1.0.0";

    // banner
    const ibbUrl = "https://i.imgur.com/YzgoR04.png";

    let bannerAttachment = null;

    try {

        const directUrl = await getIbbDirectUrl(ibbUrl);

        if (directUrl) {

            bannerAttachment = (
                await axios.get(directUrl, {
                    responseType: "stream"
                })
            ).data;
        }

    } catch (e) {}

    // HELP ALL
    if (type == "all") {

        for (const cmd of cmds.values()) {

            msg +=
`━━━━━━━━━━━━━━━
${++i}. /${cmd.config.name}
📝 ${cmd.config.description}
`;
        }

        return api.sendMessage({
            body:
`📚 ALL COMMANDS (${cmds.size} total)
━━━━━━━━━━━━━━━

${msg}
━━━━━━━━━━━━━━━
💡 Use: ${prefix}help [command]
Example: ${prefix}help admin`,
            attachment: bannerAttachment ? [bannerAttachment] : undefined
        }, tid, mid);
    }

    // SINGLE COMMAND INFO
    if (type) {

        for (const cmd of cmds.values()) {
            array.push(cmd.config.name.toString());
        }

        if (!array.find(n => n == type)) {

            const stringSimilarity = require('string-similarity');

            const checker = stringSimilarity.findBestMatch(
                type,
                array
            );

            return api.sendMessage(
`❌ Command not found: ${type}

💡 Did you mean:
/${checker.bestMatch.target}`,
                tid,
                mid
            );
        }

        const cmd = cmds.get(type).config;

        return api.sendMessage({
            body:
`📖 COMMAND INFO
━━━━━━━━━━━━━━━

📌 Name: /${cmd.name}
👤 Author: ${cmd.credits}
🌾 Version: ${cmd.version}
🔐 Permission: ${getPermText(cmd.hasPermssion)}
📝 Description: ${cmd.description}
🏷️ Category: ${cmd.commandCategory}
📎 Usage: ${prefix}${cmd.usages}
⏳ Cooldown: ${cmd.cooldowns}s`,
            attachment: bannerAttachment ? [bannerAttachment] : undefined
        }, tid, mid);
    }

    // DEFAULT HELP
    buildCmdCategory(array, cmds);

    array.sort(sortByLength("nameModule"));

    for (const cmd of array) {

        const commandList = cmd.nameModule
            .map(name => `/${name}`)
            .join(", ");

        msg +=
`━━━━━━━━━━━━━━━
📂 ${cmd.cmdCategory.toUpperCase()}
📊 ${cmd.nameModule.length} Commands

${commandList}

`;
    }

    return api.sendMessage({
        body:
`🤖 ${NameBot} v${version}

${msg}
━━━━━━━━━━━━━━━
📚 ${prefix}help all
📖 ${prefix}help [command]

Example:
${prefix}help admin`,
        attachment: bannerAttachment ? [bannerAttachment] : undefined
    }, tid);
};

function buildCmdCategory(array, cmds) {

    for (const cmd of cmds.values()) {

        const {
            commandCategory,
            hasPermssion,
            name: nameModule
        } = cmd.config;

        if (!array.find(i => i.cmdCategory == commandCategory)) {

            array.push({
                cmdCategory: commandCategory,
                permission: hasPermssion,
                nameModule: [nameModule]
            });

        } else {

            array.find(i =>
                i.cmdCategory == commandCategory
            ).nameModule.push(nameModule);
        }
    }
}

function sortByLength(k) {

    return (a, b) =>
        a[k].length > b[k].length ? -1 :
        a[k].length < b[k].length ? 1 : 0;
}

function getPermText(permission) {

    return permission == 0
        ? "Member"
        : permission == 1
        ? "Group Admin"
        : permission == 2
        ? "Bot Admin"
        : "Bot Owner";
}
