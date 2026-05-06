const { spawn } = require("child_process");
const http = require("http");
const logger = require("./utils/log");

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "online",
        bot: "Mirai Bot V3",
        version: "3.0.0",
        team: "TEAM STARTCOPE BETA",
        uptime: process.uptime()
    }));
});
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        logger(`Port ${PORT} already in use — skipping health check server`, "[ SERVER ]");
    } else {
        logger(`Server error: ${err.message}`, "[ SERVER ]");
    }
});
server.listen(PORT, () => {
    logger(`Health check server running on port ${PORT}`, "[ SERVER ]");
});

function startBot(message) {
    if (message) logger(message, "[ Starting ]");
    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "mirai.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });
    child.on("close", (codeExit) => {
        if (codeExit !== 0 || (global.countRestart && global.countRestart < 5)) {
            global.countRestart = (global.countRestart || 0) + 1;
            startBot("Restarting...");
        }
    });
    child.on("error", (error) => {
        logger("An error occurred: " + JSON.stringify(error), "[ Starting ]");
    });
}

startBot();
