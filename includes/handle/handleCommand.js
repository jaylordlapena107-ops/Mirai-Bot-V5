module.exports = function ({ api, models, Users, Threads, Currencies }) {
  const stringSimilarity = require('string-similarity');
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const logger = require("../../utils/log.js");
  const moment = require("moment-timezone");
  const bold = require("../../utils/bold");

  return async function ({ event }) {
    const dateNow = Date.now();
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    const { allowInbox, PREFIX, ADMINBOT, NDH, DeveloperMode } = global.config;
    const { userBanned, threadBanned, threadInfo, threadData, commandBanned } = global.data;
    const { commands, cooldowns } = global.client;
    var { body, senderID, threadID, messageID } = event;
    senderID = String(senderID);
    threadID = String(threadID);

    const threadSetting = threadData.get(threadID) || {};
    const currentPrefix = threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : PREFIX;
    const prefixRegex = new RegExp(`^(<@!?${senderID}>|${escapeRegex(currentPrefix)})\\s*`);

    if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox == false && senderID == threadID)) {
      if (!ADMINBOT.includes(senderID.toString())) {
        if (userBanned.has(senderID)) {
          const { reason, dateAdded } = userBanned.get(senderID) || {};
          return api.sendMessage(
            `🚫 ${bold('You are banned from using this bot')}\n📝 Reason: ${reason}\n📅 Date: ${dateAdded}`,
            threadID, messageID
          );
        } else if (threadBanned.has(threadID)) {
          const { reason, dateAdded } = threadBanned.get(threadID) || {};
          return api.sendMessage(
            `🚫 ${bold('This group is banned')}\n📝 Reason: ${reason}\n📅 Date: ${dateAdded}`,
            threadID, messageID
          );
        }
      }
    }

    body = body !== undefined ? body : 'x';
    const [matchedPrefix] = body.match(prefixRegex) || [''];
    var args = body.slice(matchedPrefix.length).trim().split(/ +/);
    var commandName = args.shift().toLowerCase();
    var command = commands.get(commandName);

    if (!prefixRegex.test(body)) {
      args = (body || '').trim().split(/ +/);
      commandName = args.shift()?.toLowerCase();
      command = commands.get(commandName);
      if (command && command.config) {
        if (command.config.prefix === false && commandName.toLowerCase() !== command.config.name.toLowerCase()) return;
        if (command.config.prefix === true && !body.startsWith(currentPrefix)) return;
        if (typeof command.config.prefix === 'undefined') return;
      }
    }

    if (!command) {
      if (!body.startsWith(currentPrefix)) return;
      var allCommandName = [];
      for (const cmd of commands.keys()) allCommandName.push(cmd);
      if (allCommandName.length === 0) return;
      const checker = stringSimilarity.findBestMatch(commandName, allCommandName);
      if (checker.bestMatch.rating >= 0.5) command = global.client.commands.get(checker.bestMatch.target);
      else return api.sendMessage(
        `❎ ${bold('Command not found')}\n💡 Did you mean: "${checker.bestMatch.target}"?`,
        threadID, messageID
      );
    }

    if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
      if (!ADMINBOT.includes(senderID)) {
        const banThreads = commandBanned.get(threadID) || [];
        const banUsers = commandBanned.get(senderID) || [];
        if (banThreads.includes(command.config.name))
          return api.sendMessage(`🚫 ${bold('Command Disabled')} in this group: ${command.config.name}`, threadID, messageID);
        if (banUsers.includes(command.config.name))
          return api.sendMessage(`🚫 ${bold('You cannot use')} this command: ${command.config.name}`, threadID, messageID);
      }
    }

    if (command.config.commandCategory?.toLowerCase() == 'nsfw' && !global.data.threadAllowNSFW.includes(threadID) && !ADMINBOT.includes(senderID))
      return api.sendMessage(`🔞 ${bold('NSFW is disabled')} in this group.`, threadID, messageID);

    var threadInfo2;
    if (event.isGroup) {
      try {
        threadInfo2 = (threadInfo.get(threadID) || await Threads.getInfo(threadID));
        if (Object.keys(threadInfo2).length == 0) throw new Error();
      } catch (err) {
        logger(global.getText("handleCommand", "cantGetInfoThread", "error"));
      }
    }

    var permssion = 0;
    try {
      const threadInfoData = (await Threads.getData(threadID)).threadInfo;
      if (threadInfoData && threadInfoData.adminIDs) {
        const find = threadInfoData.adminIDs.find(el => el.id == senderID);
        if (NDH.includes(senderID.toString())) permssion = 3;
        else if (ADMINBOT.includes(senderID.toString())) permssion = 2;
        else if (find) permssion = 1;
      } else {
        if (NDH.includes(senderID.toString())) permssion = 3;
        else if (ADMINBOT.includes(senderID.toString())) permssion = 2;
      }
    } catch (e) {
      if (NDH.includes(senderID.toString())) permssion = 3;
      else if (ADMINBOT.includes(senderID.toString())) permssion = 2;
    }

    const roleNames = { 1: "Group Admin", 2: "Bot Admin", 3: "Bot Owner" };
    if (command.config.hasPermssion > permssion) {
      return api.sendMessage(
        `🔒 ${bold('Permission Required')}\n📌 Command: ${command.config.name}\n👑 Requires: ${roleNames[command.config.hasPermssion] || "Unknown"}`,
        threadID, messageID
      );
    }

    if (!global.client.cooldowns.has(command.config.name)) global.client.cooldowns.set(command.config.name, new Map());
    const timestamps = global.client.cooldowns.get(command.config.name);
    const expirationTime = (command.config.cooldowns || 1) * 1000;
    if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime)
      return api.setMessageReaction('⏳', event.messageID, () => {}, true);

    var getText2;
    if (command.languages && typeof command.languages == 'object' && command.languages.hasOwnProperty(global.config.language))
      getText2 = (...values) => {
        var lang = command.languages[global.config.language][values[0]] || '';
        for (var i = values.length; i > 1; i--) lang = lang.replace(RegExp('%' + i, 'g'), values[i]);
        return lang;
      };
    else getText2 = () => {};

    try {
      command.run({ api, event, args, models, Users, Threads, Currencies, permssion, getText: getText2 });
      timestamps.set(senderID, dateNow);
      if (DeveloperMode) logger(`[${time}] ${commandName} | ${senderID} | ${threadID} | ${args.join(" ")} | ${Date.now() - dateNow}ms`, "[ DEV ]");
      return;
    } catch (e) {
      console.log(e);
      return api.sendMessage(`❌ ${bold('Error in command:')} ${commandName}\n${e}`, threadID);
    }
  };
};
