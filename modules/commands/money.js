module.exports.config = {
    name: "money",
    version: "1.1.1",
    hasPermssion: 0,
    credits: "Quat",
    description: "Check or manage money balance",
    commandCategory: "User",
    usages: "/money [ + , - , * , / , ++ , -- , +- , +% , -% , pay ]",
    cooldowns: 0,
    usePrefix: false,
};

module.exports.run = async function ({ Currencies, api, event, args, Users, permssion }) {
    const axios = require("axios");
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;
    let targetID = senderID;

    if (type == 'message_reply') {
        targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
    }

    const name = (await Users.getNameUser(targetID));
    const i = (url) => axios.get(url, { responseType: "stream" }).then((r) => r.data);
    const link = "https://files.catbox.moe/shxujt.gif";
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Ho_Chi_Minh").format('HH:mm:ss - DD/MM/YYYY');
    const currencyData = await Currencies.getData(targetID);
    const money = currencyData ? currencyData.money : 0;
    const mon = args[1];

    try {
        switch (args[0]) {
            case "+": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.increaseMoney(targetID, parseInt(mon));
                return api.sendMessage({ body: `💸 Added ${mon}$ to ${name}'s balance\n💸 New balance: ${money + parseInt(mon)}$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "-": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.increaseMoney(targetID, parseInt(-mon));
                return api.sendMessage({ body: `💸 Deducted ${mon}$ from ${name}'s balance\n💸 New balance: ${money - mon}$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "*": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.increaseMoney(targetID, parseInt(money * (args[1] - 1)));
                return api.sendMessage({ body: `💸 Multiplied ${name}'s balance by ${mon}\n💸 New balance: ${money * mon}$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "/": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.increaseMoney(targetID, parseInt(-money + (money / mon)));
                return api.sendMessage({ body: `💸 Divided ${name}'s balance by ${args[1]}\n💸 New balance: ${money / mon}$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "++": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.increaseMoney(targetID, Infinity);
                return api.sendMessage({ body: `💸 ${name}'s balance set to Infinity\n💸 Balance: Infinity$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "--": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.decreaseMoney(targetID, parseInt(money));
                return api.sendMessage({ body: `💸 ${name}'s balance has been reset\n💸 Balance: 0$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "+-": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.decreaseMoney(targetID, parseInt(money));
                await Currencies.increaseMoney(targetID, parseInt(mon));
                return api.sendMessage({ body: `💸 ${name}'s balance set to ${mon}$\n💸 Current balance: ${mon}$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "+%": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.increaseMoney(targetID, parseInt(money / (100 / args[1])));
                return api.sendMessage({ body: `💸 Added ${args[1]}% to ${name}'s balance\n💸 New balance: ${money + (money / (100 / args[1]))}$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "-%": {
                if (permssion < 2) return api.sendMessage("You don't have permission.", event.threadID);
                await Currencies.increaseMoney(targetID, parseInt(-(money / (100 / args[1]))));
                return api.sendMessage({ body: `💸 Deducted ${args[1]}% from ${name}'s balance\n💸 New balance: ${money - (money / (100 / args[1]))}$\n⏰ ${time}`, attachment: await i(link) }, event.threadID);
            }
            case "pay": {
                const senderMoney = (await Currencies.getData(event.senderID))?.money || 0;
                var bet = args[1] === 'all' ? senderMoney : parseInt(args[1]);
                if (senderMoney < 1 || senderMoney < bet) return api.sendMessage({ body: "You have insufficient balance.", attachment: await i(link) }, event.threadID);
                await Currencies.increaseMoney(event.senderID, parseInt(-bet));
                await Currencies.increaseMoney(targetID, parseInt(bet));
                return api.sendMessage(`Transferred ${bet}$ to ${name}`, event.threadID);
            }
        }
    } catch (e) {
        console.log(e);
    }

    if (money === Infinity) return api.sendMessage(`${name} has infinite money`, event.threadID);
    if (money === null || money === undefined) return api.sendMessage(`${name} has $0`, event.threadID);
    if (!args[0]) return api.sendMessage(`${name} has $${money}`, event.threadID);
};
