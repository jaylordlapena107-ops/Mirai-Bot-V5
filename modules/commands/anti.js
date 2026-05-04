const { existsSync, readFileSync, writeFileSync } = require("fs-extra");
const path = require('path');
const fs = require('fs');
const bold = require('../../utils/bold');

module.exports.config = {
    name: "anti",
    version: "4.1.5",
    hasPermssion: 1,
    credits: "BraSL",
    description: "Anti change group settings (name, image, nickname, etc.)",
    commandCategory: "Group",
    usages: "anti [1-9] to toggle modes",
    cooldowns: 5,
};

module.exports.handleReply = async function ({ api, event, args, handleReply, Threads }) {
    const { senderID, threadID, messageID } = event;
    const { author, permssion } = handleReply;
    const pathData = global.anti;
    if (!pathData || !existsSync(pathData)) return api.sendMessage(`❎ ${bold('Anti data not found.')}`, threadID);
    const dataAnti = JSON.parse(readFileSync(pathData, "utf8"));
    if (author !== senderID) return api.sendMessage(`❎ ${bold('This is not your command.')}`, threadID);

    var number = event.body.split(" ").filter(i => !isNaN(i));
    for (const num of number) {
        switch (num) {
            case "1": {
                if (permssion < 1) return api.sendMessage(`🔒 ${bold('Permission required.')}`, threadID, messageID);
                const existing = dataAnti.boxname.find(item => item.threadID === threadID);
                if (existing) {
                    dataAnti.boxname = dataAnti.boxname.filter(item => item.threadID !== threadID);
                    api.sendMessage(`☑️ ${bold('Anti name:')} OFF`, threadID, messageID);
                } else {
                    const threadName = (await api.getThreadInfo(threadID)).threadName;
                    dataAnti.boxname.push({ threadID, name: threadName });
                    api.sendMessage(`☑️ ${bold('Anti name:')} ON ✅`, threadID, messageID);
                }
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                break;
            }
            case "2": {
                if (permssion < 1) return api.sendMessage(`🔒 ${bold('Permission required.')}`, threadID, messageID);
                const existing = dataAnti.boximage.find(item => item.threadID === threadID);
                if (existing) {
                    dataAnti.boximage = dataAnti.boximage.filter(item => item.threadID !== threadID);
                    api.sendMessage(`☑️ ${bold('Anti image:')} OFF`, threadID, messageID);
                } else {
                    dataAnti.boximage.push({ threadID, url: "" });
                    api.sendMessage(`☑️ ${bold('Anti image:')} ON ✅`, threadID, messageID);
                }
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                break;
            }
            case "3": {
                if (permssion < 1) return api.sendMessage(`🔒 ${bold('Permission required.')}`, threadID, messageID);
                const existing = dataAnti.antiNickname.find(item => item.threadID === threadID);
                if (existing) {
                    dataAnti.antiNickname = dataAnti.antiNickname.filter(item => item.threadID !== threadID);
                    api.sendMessage(`☑️ ${bold('Anti nickname:')} OFF`, threadID, messageID);
                } else {
                    const nickNames = (await api.getThreadInfo(threadID)).nicknames;
                    dataAnti.antiNickname.push({ threadID, data: nickNames });
                    api.sendMessage(`☑️ ${bold('Anti nickname:')} ON ✅`, threadID, messageID);
                }
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                break;
            }
            case "4": {
                const antiout = dataAnti.antiout;
                antiout[threadID] = !antiout[threadID];
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                api.sendMessage(`☑️ ${bold('Anti leave:')} ${antiout[threadID] ? 'ON ✅' : 'OFF'}`, threadID, messageID);
                break;
            }
            case "5": {
                const filepath = path.join(__dirname, 'data', 'antiemoji.json');
                if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, JSON.stringify({}), 'utf8');
                let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                let emoji = "";
                try { emoji = (await api.getThreadInfo(threadID)).emoji; } catch (e) {}
                if (!data[threadID]) {
                    data[threadID] = { emoji, emojiEnabled: true };
                } else {
                    data[threadID].emojiEnabled = !data[threadID].emojiEnabled;
                    if (data[threadID].emojiEnabled) data[threadID].emoji = emoji;
                }
                fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
                api.sendMessage(`☑️ ${bold('Anti emoji:')} ${data[threadID].emojiEnabled ? 'ON ✅' : 'OFF'}`, threadID, messageID);
                break;
            }
            case "6": {
                const filepath = path.join(__dirname, 'data', 'antitheme.json');
                if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, JSON.stringify({}), 'utf8');
                let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                let theme = "";
                try { const info = await Threads.getInfo(threadID); theme = info.threadTheme?.id || ""; } catch (e) {}
                if (!data[threadID]) {
                    data[threadID] = { themeid: theme, themeEnabled: true };
                } else {
                    data[threadID].themeEnabled = !data[threadID].themeEnabled;
                    if (data[threadID].themeEnabled) data[threadID].themeid = theme;
                }
                fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
                api.sendMessage(`☑️ ${bold('Anti theme:')} ${data[threadID].themeEnabled ? 'ON ✅' : 'OFF'}`, threadID, messageID);
                break;
            }
            case "7": {
                const antiqtvPath = path.join(__dirname, 'data', 'antiqtv.json');
                if (!fs.existsSync(antiqtvPath)) fs.writeFileSync(antiqtvPath, JSON.stringify({}), 'utf8');
                const info = await api.getThreadInfo(threadID);
                if (!info.adminIDs.some(item => item.id == api.getCurrentUserID()))
                    return api.sendMessage(`❎ ${bold('Bot needs admin permission.')}`, threadID, messageID);
                let data = JSON.parse(fs.readFileSync(antiqtvPath));
                data[threadID] = !data[threadID];
                fs.writeFileSync(antiqtvPath, JSON.stringify(data, null, 4));
                api.sendMessage(`☑️ ${bold('Anti admin change:')} ${data[threadID] ? 'ON ✅' : 'OFF'}`, threadID, messageID);
                break;
            }
            case "9": {
                const aiImage = dataAnti.boximage.find(item => item.threadID === threadID);
                const aiBoxname = dataAnti.boxname.find(item => item.threadID === threadID);
                const aiNickname = dataAnti.antiNickname.find(item => item.threadID === threadID);
                return api.sendMessage(
                    `╔══════════════════╗\n║  🛡️ ${bold('ANTI STATUS')}   ║\n╚══════════════════╝\n\n` +
                    `1️⃣ ${bold('Anti name:')} ${aiBoxname ? '✅ ON' : '❌ OFF'}\n` +
                    `2️⃣ ${bold('Anti image:')} ${aiImage ? '✅ ON' : '❌ OFF'}\n` +
                    `3️⃣ ${bold('Anti nickname:')} ${aiNickname ? '✅ ON' : '❌ OFF'}\n` +
                    `4️⃣ ${bold('Anti leave:')} ${dataAnti.antiout[threadID] ? '✅ ON' : '❌ OFF'}`,
                    threadID
                );
            }
            default:
                api.sendMessage(`❎ ${bold('Invalid option.')} Use 1-9.`, threadID);
        }
    }
};

module.exports.run = async ({ api, event, permssion }) => {
    const { threadID, messageID, senderID } = event;
    return api.sendMessage(
        `╔══════════════════╗\n║  🛡️ ${bold('ANTI SYSTEM')}   ║\n╚══════════════════╝\n\n` +
        `1️⃣ ${bold('Anti Name')} — block group name change\n` +
        `2️⃣ ${bold('Anti Image')} — block group photo change\n` +
        `3️⃣ ${bold('Anti Nickname')} — block nickname changes\n` +
        `4️⃣ ${bold('Anti Leave')} — block members from leaving\n` +
        `5️⃣ ${bold('Anti Emoji')} — block emoji change\n` +
        `6️⃣ ${bold('Anti Theme')} — block theme change\n` +
        `7️⃣ ${bold('Anti Admin')} — block admin changes\n` +
        `9️⃣ ${bold('Status')} — check current status\n\n` +
        `💬 ${bold('Reply')} with the number to toggle`,
        threadID,
        (error, info) => {
            if (error) return api.sendMessage(`❌ Error!`, threadID);
            global.client.handleReply.push({
                name: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
                permssion
            });
        }, messageID
    );
};
