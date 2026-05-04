const moment = require('moment-timezone');
const os = require('os');
const bold = require('../../utils/bold');

module.exports.config = {
    name: "uptime",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "quocduy",
    description: "View system and bot uptime info",
    commandCategory: "System",
    usages: "[]",
    cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPct = ((usedMem / totalMem) * 100).toFixed(2);
    const toGB = bytes => (bytes / 1024 / 1024 / 1024).toFixed(2);
    const time = moment.tz("Asia/Manila").format("hh:mm:ss A | ddd, MMM D YYYY");

    const msg =
        `╔══════════════════╗\n` +
        `║  🤖 ${bold('SYSTEM INFO')}   ║\n` +
        `╚══════════════════╝\n\n` +
        `⏱️ ${bold('Bot Uptime')}\n` +
        `   ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}\n\n` +
        `💻 ${bold('System')}\n` +
        `   🖥️ Platform: ${os.platform()}\n` +
        `   🔧 CPU: ${os.cpus()[0].model.slice(0,30)}\n` +
        `   🏠 Host: ${os.hostname()}\n\n` +
        `🔋 ${bold('Memory')}\n` +
        `   📦 Total: ${toGB(totalMem)} GB\n` +
        `   ✅ Used: ${toGB(usedMem)} GB\n` +
        `   💚 Free: ${toGB(freeMem)} GB\n` +
        `   📊 Usage: ${memPct}%\n\n` +
        `🕐 ${bold('Time:')} ${time}`;

    api.sendMessage(msg, event.threadID, event.messageID);
};
