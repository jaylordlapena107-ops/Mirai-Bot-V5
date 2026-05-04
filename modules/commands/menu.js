module.exports.config = {
    name: 'menu',
    version: '1.1.1',
    hasPermssion: 0,
    credits: 'DC-Nam mod by Vtuan & DongDev fix',
    description: 'View command groups and command info',
    commandCategory: 'General',
    usages: '[...command name | all]',
    cooldowns: 5,
    images: [],
    envConfig: {
        autoUnsend: {
            status: true,
            timeOut: 60
        }
    }
};

const { compareTwoStrings, findBestMatch } = require('string-similarity');
const { readFileSync, writeFileSync, existsSync } = require('fs-extra');

module.exports.run = async function ({ api, event, args }) {
    const axios = require("axios");
    const moment = require("moment-timezone");
    const { sendMessage: send, unsendMessage: un } = api;
    const { threadID: tid, messageID: mid, senderID: sid } = event;
    const cmds = global.client.commands;
    const autoUnsend = (global.config.menu && global.config.menu.autoUnsend) || module.exports.config.envConfig.autoUnsend;

    const url = 'https://files.catbox.moe/amblv9.gif';
    let img;
    try {
        img = (await axios.get(url, { responseType: "stream" })).data;
    } catch (e) {
        img = null;
    }
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");

    if (args.length >= 1) {
        if (typeof cmds.get(args.join(' ')) == 'object') {
            const body = infoCmds(cmds.get(args.join(' ')).config);
            return send(body, tid, mid);
        } else {
            if (args[0] == 'all') {
                const data = cmds.values();
                var txt = '╭─────────────⭓\n', count = 0;
                for (const cmd of data) txt += `│ ${++count}. ${cmd.config.name} | ${cmd.config.description}\n`;
                txt += `\n├────────⭔\n│ ⏳ Auto-unsend after: ${autoUnsend.timeOut}s\n╰─────────────⭓`;
                return send(
                    { body: txt, attachment: img ? [img] : undefined }, tid,
                    (a, b) => autoUnsend.status ? setTimeout(v1 => un(v1), 1000 * autoUnsend.timeOut, b.messageID) : ''
                );
            } else {
                const arrayCmds = [];
                for (const cmd of cmds.values()) arrayCmds.push(cmd.config.name);
                if (arrayCmds.length > 0) {
                    const similarly = findBestMatch(args.join(' '), arrayCmds);
                    if (similarly.bestMatch.rating >= 0.3) return send(`Did you mean "${similarly.bestMatch.target}" instead of "${args.join(' ')}"?`, tid, mid);
                }
            }
        }
    } else {
        const data = commandsGroup(cmds);
        var txt = '╭─────────────⭓\n', count = 0;
        for (const { commandCategory, commandsName } of data) txt += `│ ${++count}. ${commandCategory} | ${commandsName.length} commands\n`;
        txt += `├────────⭔\n│ 📝 Total: ${global.client.commands.size} commands\n│ ⏰ Time: ${time}\n│ 🔎 Reply 1-${data.length} to select a category\n│ ⏳ Auto-unsend after: ${autoUnsend.timeOut}s\n╰─────────────⭓`;
        return send(
            { body: txt, attachment: img ? [img] : undefined }, tid,
            (a, b) => {
                global.client.handleReply.push({ name: module.exports.config.name, messageID: b.messageID, author: sid, case: 'infoGr', data });
                if (autoUnsend.status) setTimeout(v1 => un(v1), 1000 * autoUnsend.timeOut, b.messageID);
            }, mid
        );
    }
};

module.exports.handleReply = async function ({ handleReply: $, api, event }) {
    const { sendMessage: send, unsendMessage: un } = api;
    const { threadID: tid, messageID: mid, senderID: sid, args } = event;
    const axios = require("axios");
    const autoUnsend = (global.config.menu && global.config.menu.autoUnsend) || module.exports.config.envConfig.autoUnsend;
    const cmds = global.client.commands;
    let img;
    try {
        img = (await axios.get('https://files.catbox.moe/amblv9.gif', { responseType: "stream" })).data;
    } catch (e) {
        img = null;
    }

    if (sid != $.author) {
        return send(`⛔ This is not your menu.`, tid, mid);
    }

    switch ($.case) {
        case 'infoGr': {
            var data = $.data[(+args[0]) - 1];
            if (data == undefined) {
                return send(`❎ "${args[0]}" is out of range`, tid, mid);
            }
            un($.messageID);
            var txt = `╭─────────────⭓\n│ ${data.commandCategory}\n├─────⭔\n`, count = 0;
            for (const name of data.commandsName) {
                const cmdInfo = cmds.get(name).config;
                txt += `│ ${++count}. ${name} | ${cmdInfo.description}\n`;
            }
            const p = prefix(tid);
            txt += `├────────⭔\n│ 🔎 Reply 1-${data.commandsName.length} to select\n│ ⏳ Auto-unsend after: ${autoUnsend.timeOut}s\n│ 📝 Use ${p}help [command] for details\n╰─────────────⭓`;
            return send(
                { body: txt, attachment: img ? [img] : undefined }, tid,
                (a, b) => {
                    global.client.handleReply.push({ name: module.exports.config.name, messageID: b.messageID, author: sid, case: 'infoCmds', data: data.commandsName });
                    if (autoUnsend.status) setTimeout(v1 => un(v1), 1000 * autoUnsend.timeOut, b.messageID);
                }
            );
        }
        case 'infoCmds': {
            var data = cmds.get($.data[(+args[0]) - 1]);
            if (typeof data != 'object') {
                return send(`⚠️ "${args[0]}" is out of range`, tid, mid);
            }
            const { config = {} } = data || {};
            un($.messageID);
            return send(infoCmds(config), tid, mid);
        }
        default:
    }
};

function commandsGroup(cmds) {
    const array = [];
    for (const cmd of cmds.values()) {
        const { name, commandCategory } = cmd.config;
        const find = array.find(i => i.commandCategory == commandCategory);
        !find ? array.push({ commandCategory, commandsName: [name] }) : find.commandsName.push(name);
    }
    array.sort((a, b) => (a.commandsName.length > b.commandsName.length ? -1 : a.commandsName.length < b.commandsName.length ? 1 : 0));
    return array;
}

function infoCmds(a) {
    return `╭── INFO ────⭓\n│ 📔 Name: ${a.name}\n│ 🌴 Version: ${a.version}\n│ 🔐 Permission: ${permissionText(a.hasPermssion)}\n│ 👤 Author: ${a.credits}\n│ 🌾 Description: ${a.description}\n│ 📎 Category: ${a.commandCategory}\n│ 📝 Usage: ${a.usages}\n│ ⏳ Cooldown: ${a.cooldowns}s\n╰─────────────⭓`;
}

function permissionText(a) {
    return a == 0 ? 'Member' : a == 1 ? 'Group Admin' : a == 2 ? 'Bot Admin' : 'Bot Owner';
}

function prefix(tid) {
    const tidData = global.data.threadData.get(tid) || {};
    return tidData.PREFIX || global.config.PREFIX;
}
