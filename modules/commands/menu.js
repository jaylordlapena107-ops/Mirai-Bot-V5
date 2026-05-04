module.exports.config = {
    name: 'menu',
    version: '1.1.2',
    hasPermssion: 0,
    credits: 'DC-Nam mod by Vtuan & DongDev',
    description: 'View command groups and command info',
    commandCategory: 'General',
    usages: '[...command name | all]',
    cooldowns: 5,
    images: [],
    envConfig: {
        autoUnsend: {
            status: false,
            timeOut: 60
        }
    }
};

const { compareTwoStrings, findBestMatch } = require('string-similarity');
const bold = require('../../utils/bold');

module.exports.run = async function ({ api, event, args }) {
    const axios = require("axios");
    const moment = require("moment-timezone");
    const { threadID: tid, messageID: mid, senderID: sid } = event;
    const cmds = global.client.commands;
    const time = moment.tz("Asia/Manila").format("hh:mm A | ddd, MMM D YYYY");

    let img;
    try {
        img = (await axios.get('https://files.catbox.moe/amblv9.gif', { responseType: "stream" })).data;
    } catch (e) { img = null; }

    if (args.length >= 1) {
        if (cmds.has(args.join(' '))) {
            return api.sendMessage(infoCmds(cmds.get(args.join(' ')).config), tid, mid);
        } else if (args[0] == 'all') {
            var txt = `╔══════════════════╗\n║  📚 ${bold('ALL COMMANDS')}   ║\n╚══════════════════╝\n\n`, count = 0;
            for (const cmd of cmds.values()) {
                txt += `${++count}. ${bold(cmd.config.name)} — ${cmd.config.description}\n`;
            }
            txt += `\n📊 ${bold('Total:')} ${cmds.size} commands`;
            return api.sendMessage({ body: txt, attachment: img ? [img] : undefined }, tid);
        } else {
            const arrayCmds = [];
            for (const cmd of cmds.values()) arrayCmds.push(cmd.config.name);
            if (arrayCmds.length > 0) {
                const similarly = findBestMatch(args.join(' '), arrayCmds);
                if (similarly.bestMatch.rating >= 0.3)
                    return api.sendMessage(`💡 ${bold('Did you mean:')} "${similarly.bestMatch.target}" instead of "${args.join(' ')}"?`, tid, mid);
            }
        }
    } else {
        const data = commandsGroup(cmds);
        var txt = `╔══════════════════╗\n║  🤖 ${bold('MIRAI-V3 MENU')} ║\n╚══════════════════╝\n\n`, count = 0;
        for (const { commandCategory, commandsName } of data) {
            txt += `📂 ${++count}. ${bold(commandCategory)} — ${commandsName.length} cmds\n`;
        }
        txt += `\n├─────────────────\n`;
        txt += `📊 ${bold('Commands:')} ${cmds.size}\n`;
        txt += `⏰ ${bold('Time:')} ${time}\n`;
        txt += `👑 ${bold('Admin:')} Manuelson Yasis\n`;
        txt += `💬 ${bold('Reply')} 1-${data.length} to browse a category`;

        return api.sendMessage(
            { body: txt, attachment: img ? [img] : undefined }, tid,
            (a, b) => {
                global.client.handleReply.push({ name: module.exports.config.name, messageID: b.messageID, author: sid, case: 'infoGr', data });
            }, mid
        );
    }
};

module.exports.handleReply = async function ({ handleReply: $, api, event }) {
    const { threadID: tid, senderID: sid, args } = event;
    const cmds = global.client.commands;
    const axios = require("axios");
    let img;
    try { img = (await axios.get('https://files.catbox.moe/amblv9.gif', { responseType: "stream" })).data; } catch (e) { img = null; }

    if (sid != $.author) return api.sendMessage(`⛔ ${bold('This is not your menu.')}`, tid);

    switch ($.case) {
        case 'infoGr': {
            var data = $.data[(+args[0]) - 1];
            if (!data) return api.sendMessage(`❎ "${args[0]}" is out of range`, tid);
            var txt = `╔══════════════════╗\n║  📂 ${bold(data.commandCategory)} ║\n╚══════════════════╝\n\n`, count = 0;
            for (const name of data.commandsName) {
                const cfg = cmds.get(name).config;
                txt += `${++count}. ${bold(name)} — ${cfg.description}\n`;
            }
            txt += `\n💬 ${bold('Reply')} 1-${data.commandsName.length} for command info`;
            return api.sendMessage(
                { body: txt, attachment: img ? [img] : undefined }, tid,
                (a, b) => global.client.handleReply.push({ name: module.exports.config.name, messageID: b.messageID, author: sid, case: 'infoCmds', data: data.commandsName })
            );
        }
        case 'infoCmds': {
            var data = cmds.get($.data[(+args[0]) - 1]);
            if (!data) return api.sendMessage(`⚠️ "${args[0]}" is out of range`, tid);
            return api.sendMessage(infoCmds(data.config), tid);
        }
    }
};

function commandsGroup(cmds) {
    const array = [];
    for (const cmd of cmds.values()) {
        const { name, commandCategory } = cmd.config;
        const find = array.find(i => i.commandCategory == commandCategory);
        !find ? array.push({ commandCategory, commandsName: [name] }) : find.commandsName.push(name);
    }
    return array.sort((a, b) => b.commandsName.length - a.commandsName.length);
}

function infoCmds(a) {
    return `╔══════════════════╗\n║  📖 ${bold('CMD INFO')}      ║\n╚══════════════════╝\n\n` +
        `📌 ${bold('Name:')} ${a.name}\n` +
        `👤 ${bold('Author:')} ${a.credits}\n` +
        `🌾 ${bold('Version:')} ${a.version}\n` +
        `🔐 ${bold('Permission:')} ${permText(a.hasPermssion)}\n` +
        `📝 ${bold('Description:')} ${a.description}\n` +
        `🏷️ ${bold('Category:')} ${a.commandCategory}\n` +
        `📎 ${bold('Usage:')} ${a.usages}\n` +
        `⏳ ${bold('Cooldown:')} ${a.cooldowns}s`;
}

function permText(a) {
    return a == 0 ? '👤 Member' : a == 1 ? '⭐ Group Admin' : a == 2 ? '🌟 Bot Admin' : '👑 Bot Owner';
}

function prefix(tid) {
    return (global.data.threadData.get(tid) || {}).PREFIX || global.config.PREFIX;
}
