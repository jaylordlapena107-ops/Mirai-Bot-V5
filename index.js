const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs-extra");
const path = require("path");
const url = require("url");
const logger = require("./utils/log");

const PORT = process.env.PORT || 5000;
const WEB_DIR = path.join(__dirname, "web");

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // ── GET / → serve music search web UI ──────────────────────────────────────
  if (pathname === "/" || pathname === "/index.html") {
    try {
      const html = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    } catch (e) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Page not found");
    }
  }

  // ── GET /api/search?q=... → SoundCloud search ───────────────────────────────
  if (pathname === "/api/search") {
    const q = query.q;
    if (!q) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Missing query" }));
    }
    try {
      const play = require("play-dl");
      const results = await play.search(q, {
        source: { soundcloud: "tracks" },
        limit: 10,
      });
      const mapped = results.map((r) => ({
        title: r.name || r.title || "Unknown",
        url: r.url,
        duration: r.durationInSec || 0,
        thumbnail:
          r.thumbnails?.[0]?.url ||
          r.thumbnail?.url ||
          r.thumbnails?.[0] ||
          "",
        artist:
          r.user?.name ||
          r.publisher?.name ||
          r.channel?.name ||
          "Unknown Artist",
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ results: mapped }));
    } catch (e) {
      console.error("[Search API]", e.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // ── GET /api/download?url=...&title=... → stream MP3 ───────────────────────
  if (pathname === "/api/download") {
    const trackUrl = query.url;
    const title = (query.title || "audio").replace(/[^\w\s\-]/g, "").trim();
    if (!trackUrl) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("Missing url");
    }
    try {
      const play = require("play-dl");
      const info = await play.stream(trackUrl);
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${title}.mp3"`,
        "Transfer-Encoding": "chunked",
      });
      info.stream.pipe(res);
      req.on("close", () => {
        try { info.stream.destroy(); } catch {}
      });
    } catch (e) {
      console.error("[Download API]", e.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    }
    return;
  }

  // ── GET /health → JSON status ───────────────────────────────────────────────
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        status: "online",
        bot: "Mirai Bot V3",
        version: "3.0.0",
        team: "TEAM STARTCOPE BETA",
        uptime: process.uptime(),
      })
    );
  }

  // ── 404 ─────────────────────────────────────────────────────────────────────
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger(`Port ${PORT} already in use`, "[ SERVER ]");
  } else {
    logger(`Server error: ${err.message}`, "[ SERVER ]");
  }
});

server.listen(PORT, () => {
  logger(`Web UI running on port ${PORT}`, "[ SERVER ]");
});

function startBot(message) {
  if (message) logger(message, "[ Starting ]");
  const child = spawn(
    "node",
    ["--trace-warnings", "--async-stack-traces", "mirai.js"],
    { cwd: __dirname, stdio: "inherit", shell: true }
  );
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
