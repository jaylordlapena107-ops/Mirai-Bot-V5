# Mirai Bot V3 Unofficial 🤖

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20.x-brightgreen?style=flat-square"/>
  <img src="https://img.shields.io/badge/Platform-Facebook%20Messenger-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/License-GPL--3.0-green?style=flat-square"/>
  <img src="https://img.shields.io/badge/AI-Drian%20AI%20%7C%20Christopher%20AI-purple?style=flat-square"/>
  <img src="https://img.shields.io/badge/Team-STARTCOPE%20BETA-orange?style=flat-square"/>
</p>

> A powerful Facebook Messenger chatbot powered by **Drian AI** & **Christopher AI** — built by **TEAM STARTCOPE BETA**.  
> Free AI features: chat, image generation, image analysis, video generation & voice music — **no API key required**.

---

## 🤖 AI Features

### 🟢 Drian AI (by Manuelson Yasis | TEAM STARTCOPE BETA)
| Command | Description |
|---|---|
| `!drian [tanong]` | Chat — unlimited, no memory limit |
| `!drian imagine [prompt]` | Generate HD image (1024×1024) |
| `!drian analyze` + attach photo | Analyze & describe an image |
| Reply → `edit [prompt]` | Edit a generated image |
| `!drian reset` | Clear conversation history |

### 🔷 Christopher AI (by TEAM STARTCOPE BETA)
| Command | Description |
|---|---|
| `!christopher [tanong]` | Deep research & professional answers |
| `!christopher imagine [prompt]` | Generate HD image |
| `!christopher analyze` + photo | Analyze image professionally |
| Reply → `edit [prompt]` | Edit generated image |
| `!christopher reset` | Clear conversation |

### 🎬 Video AI
| Command | Description |
|---|---|
| `!video [prompt]` | Generate MP4 video (3 scenes, ~12 sec) |
| `!video movie [konsepto]` | Tagalog movie-style video (8 scenes) |
| `!video scenes [num] [prompt]` | Custom scene count (2–15) |
| Attach photo + `!video [prompt]` | Create video from your photo |

### 🎵 Music AI
| Command | Description |
|---|---|
| `!music [request]` | Generate song lyrics + voice audio |
| `!music chat [tanong]` | Chat about music |
| `!music lyrics [tema]` | Show lyrics only (no audio) |
| `!music reset` | Clear conversation |

> All AI features use **100% free APIs** — no API keys, no registration, no cost.

---

## 📦 Other Commands

| Category | Commands |
|---|---|
| General | `!help`, `!ping`, `!uid`, `!upt` |
| Group | `!prefix`, `!setname`, `!anti`, `!duyet` |
| Admin | `!admin`, `!cmd`, `!shell`, `!run` |
| Economy | `!money` |
| Utility | `!note`, `!menu`, `!contact`, `!qtv` |

---

## 🚀 Quick Setup

### Requirements
- **Node.js 20+**
- **Facebook account** (dedicated bot account recommended)
- `appstate.json` or `cookie.txt` (Facebook session)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/DongDev-VN/Mirai-Bot-V3
cd Mirai-Bot-V3

# 2. Install dependencies
npm install

# 3. Add your Facebook credentials
# Option A: Paste your appstate (JSON array) into appstate.json
# Option B: Paste cookies into cookie.txt

# 4. Configure the bot
# Edit config.json — set ADMINBOT, PREFIX, BOTNAME, etc.

# 5. Start the bot
npm start
```

---

## ⚙️ Configuration (`config.json`)

```json
{
  "PREFIX": "!",
  "BOTNAME": "Mirai-V3",
  "ADMINBOT": ["your_facebook_id"],
  "language": "en",
  "FCAOption": { "listenEvents": true, "autoReconnect": true }
}
```

---

## ☁️ Deployment

### Render.com (Recommended — Best for persistent bots)
1. Push to GitHub
2. Create a new **Background Worker** on Render
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add environment variable: `appstate.json` content as `APPSTATE` (optional)

### Railway / Heroku
- Uses `Procfile` → `web: node index.js`
- Set `PORT` env var if required by platform
- Bot includes a built-in HTTP health check server on `$PORT`

### Other Platforms
- **Glitch**: Works out of the box — `npm start`
- **VPS/Linux**: Run with `pm2 start index.js --name mirai-bot`
- **Netlify / Vercel**: Not recommended (serverless, no persistent connections)

---

## 🌐 Free APIs Used (No Keys Required)

| Feature | API |
|---|---|
| 💬 AI Chat | `https://text.pollinations.ai/` |
| 🎨 Image Generation | `https://image.pollinations.ai/prompt/[prompt]` |
| 🔍 Image Analysis (Vision) | `https://api.airforce/v1/chat/completions` |
| 🎵 Voice/TTS Audio | `https://translate.google.com/translate_tts` |
| 🎬 Video | FFmpeg + Pollinations image frames |

---

## 🗂️ Project Structure

```
Mirai-Bot-V3/
├── index.js              # Entry point + HTTP health check
├── mirai.js              # Main bot logic (login, MQTT, module loader)
├── config.json           # Bot configuration
├── modules/
│   ├── commands/         # All bot commands (drian, christopher, video, music, etc.)
│   └── events/           # Event handlers (join/leave notifications)
├── includes/
│   ├── database/         # SQLite + Sequelize models
│   ├── controllers/      # Users, Threads, Currencies controllers
│   └── handle/           # Message/command/event handlers
├── languages/            # en.lang, vi.lang
├── utils/                # Logging, bold font, utilities
├── Procfile              # For Heroku/Railway deployment
├── render.yaml           # For Render.com deployment
└── appstate.json         # Facebook credentials (gitignored)
```

---

## ⚠️ Important Notes

- `appstate.json` and `cookie.txt` are in `.gitignore` — **never commit credentials**
- `appstate.json` must be a **valid JSON array** (not placeholder text)
- Bot auto-restarts on crash (up to 5 times via `index.js`)
- Render.com **Worker** is the best fit — MQTT needs a persistent connection
- All AI features work without any API keys

---

## 👥 Credits

| Name | Role |
|---|---|
| **Manuelson Yasis** | Creator of Drian AI |
| **TEAM STARTCOPE BETA** | Christopher AI, Video AI, Music AI |
| DongDev | Original Mirai Bot V3 framework |
| CatalizCS & SpermLord | Original Mirai V2 |

---

## 📞 Contact

- Facebook: [Manuelson Yasis](https://www.facebook.com/manuelson.yasis)
- Team: TEAM STARTCOPE BETA
