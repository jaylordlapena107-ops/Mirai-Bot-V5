const bold = require('../../utils/bold');

module.exports.config = {
    name: "money",
    version: "1.1.1",
    hasPermssion: 0,
    credits: "Quat",
    description: "Check or manage money balance",
    commandCategory: "User",
    usages: "[ + , - , * , / , ++ , -- , +- , +% , -% , pay ]",
    cooldowns: 0,
    usePrefix: false,
};

module.exports.run = async function ({ Currencies, api, event, args, Users, permssion }) {
    const axios = require("axios");
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Manila").format('hh:mm A - MMM D, YYYY');
    let targetID = senderID;

    if (type == 'message_reply') targetID = messageReply.senderID;
    else if (Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];

    const name = await Users.getNameUser(targetID);
    const currencyData = await Currencies.getData(targetID);
    const money = currencyData ? currencyData.money : 0;
    const mon = args[1];
    const needPerm = () => api.sendMessage(`🔒 ${bold('Permission Required')}\n📌 Bot Admin+ needed.`, threadID);

    const sendMoney = (body) => api.sendMessage(body, threadID);

    try {
        switch (args[0]) {
            case "+": {
                if (permssion < 2) return needPerm();
                await Currencies.increaseMoney(targetID, parseInt(mon));
                return sendMoney(`💸 ${bold('Money Added')}\n👤 ${name}\n➕ Added: +${mon}$\n💰 New Balance: ${money + parseInt(mon)}$\n⏰ ${time}`);
            }
            case "-": {
                if (permssion < 2) return needPerm();
                await Currencies.increaseMoney(targetID, parseInt(-mon));
                return sendMoney(`💸 ${bold('Money Deducted')}\n👤 ${name}\n➖ Deducted: -${mon}$\n💰 New Balance: ${money - mon}$\n⏰ ${time}`);
            }
            case "*": {
                if (permssion < 2) return needPerm();
                await Currencies.increaseMoney(targetID, parseInt(money * (args[1] - 1)));
                return sendMoney(`💸 ${bold('Money Multiplied')}\n👤 ${name}\n✖️ x${mon}\n💰 New Balance: ${money * mon}$\n⏰ ${time}`);
            }
            case "/": {
                if (permssion < 2) return needPerm();
                await Currencies.increaseMoney(targetID, parseInt(-money + (money / mon)));
                return sendMoney(`💸 ${bold('Money Divided')}\n👤 ${name}\n➗ ÷${mon}\n💰 New Balance: ${money / mon}$\n⏰ ${time}`);
            }
            case "++": {
                if (permssion < 2) return needPerm();
                await Currencies.increaseMoney(targetID, Infinity);
                return sendMoney(`💸 ${bold('Balance Set to Infinity')}\n👤 ${name}\n💰 Balance: ∞$\n⏰ ${time}`);
            }
            case "--": {
                if (permssion < 2) return needPerm();
                await Currencies.decreaseMoney(targetID, parseInt(money));
                return sendMoney(`💸 ${bold('Balance Reset')}\n👤 ${name}\n💰 Balance: 0$\n⏰ ${time}`);
            }
            case "+-": {
                if (permssion < 2) return needPerm();
                await Currencies.decreaseMoney(targetID, parseInt(money));
                await Currencies.increaseMoney(targetID, parseInt(mon));
                return sendMoney(`💸 ${bold('Balance Set')}\n👤 ${name}\n💰 New Balance: ${mon}$\n⏰ ${time}`);
            }
            case "+%": {
                if (permssion < 2) return needPerm();
                const add = parseInt(money / (100 / args[1]));
                await Currencies.increaseMoney(targetID, add);
                return sendMoney(`💸 ${bold('Percentage Added')}\n👤 ${name}\n➕ +${args[1]}%\n💰 New Balance: ${money + add}$\n⏰ ${time}`);
            }
            case "-%": {
                if (permssion < 2) return needPerm();
                const sub = parseInt(money / (100 / args[1]));
                await Currencies.increaseMoney(targetID, -sub);
                return sendMoney(`💸 ${bold('Percentage Deducted')}\n👤 ${name}\n➖ -${args[1]}%\n💰 New Balance: ${money - sub}$\n⏰ ${time}`);
            }
            case "pay": {
                const senderMoney = (await Currencies.getData(senderID))?.money || 0;
                var bet = args[1] === 'all' ? senderMoney : parseInt(args[1]);
                if (senderMoney < 1 || senderMoney < bet)
                    return sendMoney(`❌ ${bold('Insufficient Balance!')}\n💰 Your balance: ${senderMoney}$`);
                await Currencies.increaseMoney(senderID, -bet);
                await Currencies.increaseMoney(targetID, bet);
                return sendMoney(`✅ ${bold('Transfer Successful!')}\n💸 Sent ${bet}$ to ${name}\n⏰ ${time}`);
            }
        }
    } catch (e) {
        console.log(e);
    }

    if (!args[0]) {
        const bal = money === Infinity ? "∞" : `${money}`;
        return sendMoney(`💰 ${bold('Balance')}\n\n👤 ${name}\n💵 $${bal}\n⏰ ${time}`);
    }
};
