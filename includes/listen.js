module.exports = function({ api, models }) {
  const fs = require('fs');
  const path = require('path');
  const Users = require("./controllers/users")({ models, api });
  const Threads = require("./controllers/threads")({ models, api });
  const Currencies = require("./controllers/currencies")({ models });
  const logger = require("../utils/log.js");

  (async () => {
    try {
      logger.loader("Loading user and thread data...");
      const [threads, users, currencies] = await Promise.all([
        Threads.getAll(),
        Users.getAll(['userID', 'name', 'data']),
        Currencies.getAll(['userID'])
      ]);

      for (let i = 0; i < threads.length; i++) {
        const data = threads[i];
        const idThread = String(data.threadID);
        global.data.allThreadID.push(idThread);
        global.data.threadData.set(idThread, data.data || {});
        global.data.threadInfo.set(idThread, data.threadInfo || {});
        if (data.data?.banned) {
          global.data.threadBanned.set(idThread, {
            reason: data.data.reason || '',
            dateAdded: data.data.dateAdded || ''
          });
        }
        if (data.data?.commandBanned?.length) {
          global.data.commandBanned.set(idThread, data.data.commandBanned);
        }
        if (data.data?.NSFW) {
          global.data.threadAllowNSFW.push(idThread);
        }
      }

      for (let i = 0; i < users.length; i++) {
        const dataU = users[i];
        const idUsers = String(dataU.userID);
        global.data.allUserID.push(idUsers);
        if (dataU.name?.length) {
          global.data.userName.set(idUsers, dataU.name);
        }
        if (dataU.data?.banned) {
          global.data.userBanned.set(idUsers, {
            reason: dataU.data.reason || '',
            dateAdded: dataU.data.dateAdded || ''
          });
        }
        if (dataU.data?.commandBanned?.length) {
          global.data.commandBanned.set(idUsers, dataU.data.commandBanned);
        }
      }

      for (let i = 0; i < currencies.length; i++) {
        const dataC = currencies[i];
        global.data.allCurrenciesID.push(String(dataC.userID));
      }

      logger.loader(`Loaded data for ${global.data.allThreadID.length} threads`);
      logger.loader(`Loaded data for ${global.data.allUserID.length} users`);
    } catch (error) {
      logger(`Failed to load environment: ${error}`, 'error');
    }
  })();

  require('./handle/handleSchedule.js')({ api, Threads, Users, models });

  logger(`${api.getCurrentUserID()} - [ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "Mirai Bot" : global.config.BOTNAME}`, "[ BOT INFO ] >");

  const handlers = fs.readdirSync(path.join(__dirname, './handle')).reduce((acc, file) => {
    return {
      ...acc,
      [path.basename(file, '.js')]: require(`./handle/${file}`)({
        api, models, Users, Threads, Currencies
      })
    };
  }, {});

  return async function(event) {
    const approvedPath = path.join(__dirname, '/../utils/data/approvedThreads.json');
    const pendingPath = path.join(__dirname, '/../utils/data/pendingThreads.json');

    if (!fs.existsSync(approvedPath)) {
      fs.writeFileSync(approvedPath, JSON.stringify([]), 'utf-8');
    }
    if (!fs.existsSync(pendingPath)) {
      fs.writeFileSync(pendingPath, JSON.stringify([]), 'utf-8');
    }

    const approvedThreads = JSON.parse(fs.readFileSync(approvedPath, 'utf-8'));
    const adminBot = global.config.ADMINBOT;
    const ndh = global.config.NDH;
    const boxAdmin = global.config.BOXADMIN;

    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(event.threadID);
    } catch (e) {
      threadInfo = { threadName: '' };
    }

    if (!approvedThreads.includes(event.threadID) && !adminBot.includes(event.senderID) && !ndh.includes(event.senderID)) {
      const threadSetting = (await Threads.getData(String(event.threadID))).data || {};
      const prefix = threadSetting.hasOwnProperty('PREFIX') ? threadSetting.PREFIX : global.config.PREFIX;

      if (event.body && event.body.toLowerCase() === 'approvegroup') {
        api.sendMessage(`[ Notice ]\n\n📜 Approval request from group ID: ${event.threadID}`, boxAdmin);
        return api.sendMessage(`✅ Approval request sent to admin!`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
          let pendingThreads = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
          if (!pendingThreads.includes(event.threadID)) {
            pendingThreads.push(event.threadID);
            fs.writeFileSync(pendingPath, JSON.stringify(pendingThreads, null, 2), 'utf-8');
          }
        });
      }

      if (event.body && event.body.startsWith(prefix)) {
        return api.sendMessage(`❎ Your group has not been approved by Admin. Type "approvegroup" to request approval.`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
        });
      }
    }

    await handlers['handleCreateDatabase']({ event });

    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        await Promise.all([
          handlers['handleCommand']({ event }),
          handlers['handleReply']({ event }),
          handlers['handleCommandEvent']({ event })
        ]);
        break;
      case "event":
        await Promise.all([
          handlers['handleEvent']({ event }),
          handlers['handleRefresh']({ event })
        ]);
        break;
      case "message_reaction":
        await handlers['handleReaction']({ event });
        break;
      default:
        break;
    }
  };
};
