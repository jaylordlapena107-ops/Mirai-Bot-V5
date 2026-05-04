module.exports.config = {
    name: "anti",
    version: "4.1.5",
    hasPermssion: 1,
    credits: "BraSL",
    description: "Anti change group settings (name, image, nickname, etc.)",
    commandCategory: "Group",
    usages: "anti [1-9] to toggle modes",
    cooldowns: 5,
    images: [],
    dependencies: { "fs-extra": "" },
};

const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const path = require('path');
const fs = require('fs');
const axios = require('axios');

module.exports.handleReply = async function ({ api, event, args, handleReply, Threads }) {
    const { senderID, threadID, messageID } = event;
    const { author, permssion } = handleReply;
    const pathData = global.anti;
    if (!pathData || !existsSync(pathData)) return api.sendMessage("❎ Anti data not found.", threadID);
    const dataAnti = JSON.parse(readFileSync(pathData, "utf8"));

    if (author !== senderID) return api.sendMessage(`❎ This is not your command.`, threadID);

    var number = event.args ? event.args.filter(i => !isNaN(i)) : event.body.split(" ").filter(i => !isNaN(i));
    for (const num of number) {
        switch (num) {
            case "1": {
                if (permssion < 1) return api.sendMessage("⚠️ You don't have permission.", threadID, messageID);
                const existing = dataAnti.boxname.find(item => item.threadID === threadID);
                if (existing) {
                    dataAnti.boxname = dataAnti.boxname.filter(item => item.threadID !== threadID);
                    api.sendMessage("☑️ Anti group name change: OFF", threadID, messageID);
                } else {
                    var threadName = (await api.getThreadInfo(event.threadID)).threadName;
                    dataAnti.boxname.push({ threadID, name: threadName });
                    api.sendMessage("☑️ Anti group name change: ON", threadID, messageID);
                }
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                break;
            }
            case "2": {
                if (permssion < 1) return api.sendMessage("⚠️ You don't have permission.", threadID, messageID);
                const existing = dataAnti.boximage.find(item => item.threadID === threadID);
                if (existing) {
                    dataAnti.boximage = dataAnti.boximage.filter(item => item.threadID !== threadID);
                    api.sendMessage("☑️ Anti group photo change: OFF", threadID, messageID);
                } else {
                    dataAnti.boximage.push({ threadID, url: "" });
                    api.sendMessage("☑️ Anti group photo change: ON", threadID, messageID);
                }
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                break;
            }
            case "3": {
                if (permssion < 1) return api.sendMessage("⚠️ You don't have permission.", threadID, messageID);
                const existing = dataAnti.antiNickname.find(item => item.threadID === threadID);
                if (existing) {
                    dataAnti.antiNickname = dataAnti.antiNickname.filter(item => item.threadID !== threadID);
                    api.sendMessage("☑️ Anti nickname change: OFF", threadID, messageID);
                } else {
                    const nickNames = (await api.getThreadInfo(event.threadID)).nicknames;
                    dataAnti.antiNickname.push({ threadID, data: nickNames });
                    api.sendMessage("☑️ Anti nickname change: ON", threadID, messageID);
                }
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                break;
            }
            case "4": {
                if (permssion < 1) return api.sendMessage("⚠️ You don't have permission.", threadID, messageID);
                const antiout = dataAnti.antiout;
                if (antiout[threadID] == true) {
                    antiout[threadID] = false;
                    api.sendMessage("☑️ Anti member leave: OFF", threadID, messageID);
                } else {
                    antiout[threadID] = true;
                    api.sendMessage("☑️ Anti member leave: ON", threadID, messageID);
                }
                writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
                break;
            }
            case "5": {
                const filepath = path.join(__dirname, 'data', 'antiemoji.json');
                if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, JSON.stringify({}), 'utf8');
                let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                let emoji = "";
                try {
                    emoji = (await api.getThreadInfo(threadID)).emoji;
                } catch (e) {}
                if (!data.hasOwnProperty(threadID)) {
                    data[threadID] = { emoji, emojiEnabled: true };
                } else {
                    data[threadID].emojiEnabled = !data[threadID].emojiEnabled;
                    if (data[threadID].emojiEnabled) data[threadID].emoji = emoji;
                }
                fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
                api.sendMessage(`☑️ Anti emoji change: ${data[threadID].emojiEnabled ? "ON" : "OFF"}`, threadID, messageID);
                break;
            }
            case "6": {
                const filepath = path.join(__dirname, 'data', 'antitheme.json');
                if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, JSON.stringify({}), 'utf8');
                let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                let theme = "";
                try {
                    const info = await Threads.getInfo(threadID);
                    theme = info.threadTheme?.id || "";
                } catch (e) {}
                if (!data.hasOwnProperty(threadID)) {
                    data[threadID] = { themeid: theme, themeEnabled: true };
                } else {
                    data[threadID].themeEnabled = !data[threadID].themeEnabled;
                    if (data[threadID].themeEnabled) data[threadID].themeid = theme;
                }
                fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
                api.sendMessage(`☑️ Anti theme change: ${data[threadID].themeEnabled ? "ON" : "OFF"}`, threadID, messageID);
                break;
            }
            case "7": {
                const antiqtvPath = path.join(__dirname, 'data', 'antiqtv.json');
                if (!fs.existsSync(antiqtvPath)) fs.writeFileSync(antiqtvPath, JSON.stringify({}), 'utf8');
                const info = await api.getThreadInfo(event.threadID);
                if (!info.adminIDs.some(item => item.id == api.getCurrentUserID()))
                    return api.sendMessage('❎ Bot needs admin permission to use this.', event.threadID, event.messageID);
                let data = JSON.parse(fs.readFileSync(antiqtvPath));
                if (!data[threadID]) {
                    data[threadID] = true;
                    api.sendMessage(`☑️ Anti admin change: ON`, threadID, messageID);
                } else {
                    data[threadID] = false;
                    api.sendMessage(`☑️ Anti admin change: OFF`, threadID, messageID);
                }
                fs.writeFileSync(antiqtvPath, JSON.stringify(data, null, 4));
                break;
            }
            case "9": {
                const aiImage = dataAnti.boximage.find(item => item.threadID === threadID);
                const aiBoxname = dataAnti.boxname.find(item => item.threadID === threadID);
                const aiNickname = dataAnti.antiNickname.find(item => item.threadID === threadID);
                return api.sendMessage(
                    `[ ANTI STATUS ]\n────────────────────\n|› 1. Anti group name: ${aiBoxname ? "ON" : "OFF"}\n|› 2. Anti group image: ${aiImage ? "ON" : "OFF"}\n|› 3. Anti nickname: ${aiNickname ? "ON" : "OFF"}\n|› 4. Anti leave: ${dataAnti.antiout[threadID] ? "ON" : "OFF"}\n────────────────────`,
                    threadID
                );
            }
            default:
                return api.sendMessage(`❎ Invalid number selected.`, threadID);
        }
    }
};

module.exports.run = async ({ api, event, permssion }) => {
    const { threadID, messageID, senderID } = event;
    return api.sendMessage(
        `╭─────────────⭓\n│ Anti Change Group Settings\n├─────⭔\n│ 1. Anti name: block group name change\n│ 2. Anti image: block group photo change\n│ 3. Anti nickname: block nickname changes\n│ 4. Anti leave: block members from leaving\n│ 5. Anti emoji: block emoji change\n│ 6. Anti theme: block theme change\n│ 7. Anti admin: block admin changes\n│ 9. Check anti status\n├────────⭔\n│ 📌 Reply with the number to toggle\n╰─────────────⭓`,
        threadID, (error, info) => {
            if (error) return api.sendMessage("❎ An error occurred!", threadID);
            global.client.handleReply.push({
                name: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
                permssion
            });
        }, messageID
    );
};
