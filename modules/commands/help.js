const axios = require('axios');
const bold = require('../../utils/bold');

module.exports.config = {
    name: "help",
    version: "1.1.2",
    hasPermssion: 0,
    credits: "DC-Nam",
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
    var type = !args[0] ? "" : args[0].toLowerCase();
    var msg = "", array = [], i = 0;
    const cmds = global.client.commands;
    const TIDdata = global.data.threadData.get(tid) || {};
    const NameBot = global.config.BOTNAME;
    const version = global.config.version;
    var prefix = TIDdata.PREFIX || global.config.PREFIX;

    const ibbUrl = "https://ibb.co/4gZpB7tw";
    let bannerAttachment = null;
    try {
        const directUrl = await getIbbDirectUrl(ibbUrl);
        if (directUrl) {
            bannerAttachment = (await axios.get(directUrl, { responseType: "stream" })).data;
        }
    } catch (e) {}

    if (type == "all") {
        for (const cmd of cmds.values()) {
            msg += `${++i}. ${bold(cmd.config.name)}\n   📝 ${cmd.config.description}\n${'─'.repeat(30)}\n`;
        }
        return api.sendMessage({
            body: `📚 ${bold('ALL COMMANDS')} (${cmds.size} total)\n${'═'.repeat(32)}\n\n${msg}`,
            attachment: bannerAttachment ? [bannerAttachment] : undefined
        }, tid, mid);
    }

    if (type) {
        for (const cmd of cmds.values()) array.push(cmd.config.name.toString());
        if (!array.find(n => n == args[0].toLowerCase())) {
            const stringSimilarity = require('string-similarity');
            const commandName = args.shift().toLowerCase() || "";
            let allCommandName = [];
            for (const cmd of cmds.keys()) allCommandName.push(cmd);
            const checker = stringSimilarity.findBestMatch(commandName, allCommandName);
            return api.sendMessage(
                `❎ ${bold('Command not found:')} ${type}\n💡 ${bold('Did you mean:')} "${checker.bestMatch.target}"`,
                tid, mid
            );
        }
        const cmd = cmds.get(type).config;
        const img = cmd.images || [];
        let attachments = bannerAttachment ? [bannerAttachment] : [];
        for (let i = 0; i < img.length; i++) {
            try {
                const stream = (await axios.get(img[i], { responseType: "stream" })).data;
                attachments.push(stream);
            } catch (e) {}
        }
        msg = `╔═══════════════════╗\n` +
              `║  📖 ${bold('COMMAND INFO')}    ║\n` +
              `╚═══════════════════╝\n\n` +
              `📌 ${bold('Name:')} ${cmd.name}\n` +
              `👤 ${bold('Author:')} ${cmd.credits}\n` +
              `🌾 ${bold('Version:')} ${cmd.version}\n` +
              `🔐 ${bold('Permission:')} ${getPermText(cmd.hasPermssion)}\n` +
              `📝 ${bold('Description:')} ${cmd.description}\n` +
              `🏷️ ${bold('Category:')} ${cmd.commandCategory}\n` +
              `📎 ${bold('Usage:')} ${prefix}${cmd.usages}\n` +
              `⏳ ${bold('Cooldown:')} ${cmd.cooldowns}s`;
        return api.sendMessage({ body: msg, attachment: attachments.length ? attachments : undefined }, tid, mid);
    } else {
        buildCmdCategory(array, cmds);
        array.sort(sortByLength("nameModule"));
        for (const cmd of array) {
            msg += `│\n│ 📂 ${bold(cmd.cmdCategory.toUpperCase())}\n├──────────⭔\n│ 📊 Total: ${cmd.nameModule.length} commands\n│ ${cmd.nameModule.join(", ")}\n├──────────⭔\n`;
        }
        const footer = `\n📊 ${bold('Total:')} ${cmds.size} commands\n` +
            `🤖 ${bold('Bot:')} ${NameBot} v${version}\n` +
            `👑 ${bold('Admin:')} Manuelson Yasis\n` +
            `🔗 ${bold('FB:')} facebook.com/manuelson.yasis\n` +
            `\n💡 ${prefix}help [command] → details\n💡 ${prefix}help all → full list`;

        return api.sendMessage({
            body: `╔══════════════════╗\n║  🤖 ${bold('MIRAI-V3 BOT')}  ║\n╚══════════════════╝\n\n╭──────────────⭓\n${msg}${footer}\n╰──────────────⭓`,
            attachment: bannerAttachment ? [bannerAttachment] : undefined
        }, tid);
    }
};

function buildCmdCategory(array, cmds) {
    for (const cmd of cmds.values()) {
        const { commandCategory, hasPermssion, name: nameModule } = cmd.config;
        if (!array.find(i => i.cmdCategory == commandCategory)) {
            array.push({ cmdCategory: commandCategory, permission: hasPermssion, nameModule: [nameModule] });
        } else {
            array.find(i => i.cmdCategory == commandCategory).nameModule.push(nameModule);
        }
    }
}

function sortByLength(k) {
    return (a, b) => a[k].length > b[k].length ? -1 : a[k].length < b[k].length ? 1 : 0;
}

function getPermText(permission) {
    return permission == 0 ? "👤 Member" : permission == 1 ? "⭐ Group Admin" : permission == 2 ? "🌟 Bot Admin" : "👑 Bot Owner";
}
