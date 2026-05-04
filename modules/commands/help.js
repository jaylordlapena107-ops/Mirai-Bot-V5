const axios = require('axios');

module.exports.config = {
    name: "help",
    version: "1.1.1",
    hasPermssion: 0,
    credits: "DC-Nam",
    description: "View command list and info",
    commandCategory: "General",
    usages: "[command name / all]",
    cooldowns: 5,
    images: [],
};

module.exports.run = async function({ api, event, args }) {
    const { threadID: tid, messageID: mid } = event;
    var type = !args[0] ? "" : args[0].toLowerCase();
    var msg = "", array = [], i = 0;
    const cmds = global.client.commands;
    const TIDdata = global.data.threadData.get(tid) || {};
    const admin = global.config.ADMINBOT;
    const NameBot = global.config.BOTNAME;
    const version = module.exports.config.version;
    var prefix = TIDdata.PREFIX || global.config.PREFIX;

    if (type == "all") {
        for (const cmd of cmds.values()) {
            msg += `${++i}. ${cmd.config.name}\n→ Description: ${cmd.config.description}\n────────────────\n`;
        }
        return api.sendMessage(msg, tid, mid);
    }

    if (type) {
        for (const cmd of cmds.values()) {
            array.push(cmd.config.name.toString());
        }
        if (!array.find(n => n == args[0].toLowerCase())) {
            const stringSimilarity = require('string-similarity');
            const commandName = args.shift().toLowerCase() || "";
            var allCommandName = [];
            for (const cmd of cmds.keys()) allCommandName.push(cmd);
            const checker = stringSimilarity.findBestMatch(commandName, allCommandName);
            msg = `❎ Command '${type}' not found.\n📝 Closest match: '${checker.bestMatch.target}'`;
            return api.sendMessage(msg, tid, mid);
        }
        const cmd = cmds.get(type).config;
        const img = cmd.images || [];
        let image = [];
        for (let i = 0; i < img.length; i++) {
            const stream = (await axios.get(img[i], { responseType: "stream" })).data;
            image.push(stream);
        }
        msg = `[ COMMAND GUIDE ]\n─────────────────\n[📜] - Name: ${cmd.name}\n[👤] - Author: ${cmd.credits}\n[🌾] - Version: ${cmd.version}\n[🌴] - Permission: ${getPermText(cmd.hasPermssion)}\n[📝] - Description: ${cmd.description}\n[🏷️] - Category: ${cmd.commandCategory}\n[🍁] - Usage: ${cmd.usages}\n[⏳] - Cooldown: ${cmd.cooldowns}s\n─────────────────`;
        return api.sendMessage({ body: msg, attachment: image }, tid, mid);
    } else {
        buildCmdCategory(array, cmds);
        array.sort(sortByLength("nameModule"));
        for (const cmd of array) {
            msg += `│\n│ ${cmd.cmdCategory.toUpperCase()}\n├────────⭔\n│ Total: ${cmd.nameModule.length} commands\n│ ${cmd.nameModule.join(", ")}\n├────────⭔\n`;
        }
        msg += `📝 Total commands: ${cmds.size}\n👤 Total bot admins: ${admin.length}\n→ Bot name: ${NameBot}\n🔰 Version: ${version}\n📎 Admin: ${global.config.FACEBOOK_ADMIN}\n${prefix}help [command name] for details\n${prefix}help all for full list`;
        return api.sendMessage(`╭─────────────⭓\n${msg}`, tid);
    }
};

function buildCmdCategory(array, cmds) {
    for (const cmd of cmds.values()) {
        const { commandCategory, hasPermssion, name: nameModule } = cmd.config;
        if (!array.find(i => i.cmdCategory == commandCategory)) {
            array.push({ cmdCategory: commandCategory, permission: hasPermssion, nameModule: [nameModule] });
        } else {
            const find = array.find(i => i.cmdCategory == commandCategory);
            find.nameModule.push(nameModule);
        }
    }
}

function sortByLength(k) {
    return function(a, b) {
        let i = 0;
        if (a[k].length > b[k].length) i = 1;
        else if (a[k].length < b[k].length) i = -1;
        return i * -1;
    };
}

function getPermText(permission) {
    return permission == 0 ? "Member" : permission == 1 ? "Group Admin" : permission == 2 ? "Bot Admin" : "Bot Owner";
}
