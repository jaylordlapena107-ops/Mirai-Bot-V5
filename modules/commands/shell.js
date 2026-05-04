module.exports.config = {
    name: "shell",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "DongDev",
    description: "Run a shell command",
    commandCategory: "Admin",
    usages: "[shell command]",
    cooldowns: 0,
    prefix: true
};

module.exports.run = async ({ api, event, args }) => {
    require("child_process").exec(args.join(" "), (err, stdout, stderr) => {
        api.sendMessage(err?.message || stderr || stdout || "(no output)", event.threadID, event.messageID);
    });
};
