# Mirai Bot V3 Unofficial

A Facebook Messenger chatbot built with Node.js that listens for messages and responds to commands and events via the Facebook Chat API.

## Run & Operate
- **Start**: `node index.js`
- **npm script**: `npm start`
- **Required credentials**: `appstate.json` (Facebook app state array) OR `cookie.txt` (Facebook cookies) must be present in the project root before the bot can log in.

## Stack
- Runtime: Node.js 20
- Facebook API: `stfca` + `@dongdev/fca-unofficial`
- Database: SQLite via Sequelize (file: `Fca_Database/database.sqlite` / `includes/data.sqlite`)
- Image processing: `canvas`, `jimp`
- Music: `msedge-tts` (Microsoft TTS), `play-dl` (SoundCloud streaming), `fluent-ffmpeg`
- Scheduling: `node-cron`

## Where things live
- `index.js` — entry point, auto-restarts `mirai.js` on crash
- `mirai.js` — main bot logic: login, load modules, connect MQTT
- `config.json` — bot settings (prefix, admin IDs, feature flags)
- `fca-config.json` — Facebook API MQTT + browser header options (anti-detect)
- `utils/protection.js` — anti-detect: UA rotation, keep-alive, rate limiter, human delays
- `modules/commands/` — 36 bot commands (see list below)
- `modules/events/` — 3 event handlers (broadcast, join/leave)
- `includes/` — database setup, controllers, event/command handlers
- `languages/` — `en.lang`, `vi.lang`
- `utils/` — logging, utilities, runtime data

## Commands (36 total)
| Command | Description |
|---|---|
| `!autopost on/off` | Admin: auto-post every 51 min to GC, 24/7 |
| `!broadcast` | Event: auto Jesus messages to all GCs every ~1 hour |
| `!radio [station/freq]` | Search PH radio stations → streams live 30-sec clip |
| `!spotify [song]` | Search SoundCloud → sends MP3 audio |
| `!createmusic [theme]` | AI generates full song + mood-matched music + voice |
| `!jingle [script]` | MS Neural TTS jingle with echo/reverb |
| `!prayer` | AI-written personal prayer |
| `!verse` | Random Bible verse with reflection |
| `!poem` | AI-written Filipino/English poem |
| `!story` | AI short story |
| `!quote` | Inspirational quote |
| `!motivate` | Motivational speech |
| `!lost` | Message for grieving |
| `!help`, `!ping`, `!uid`, `!prefix`, `!admin`, etc. | Standard bot controls |

## Architecture decisions
- `index.js` wraps `mirai.js` in a child process with up to 5 auto-restarts on crash
- Login supports both `appstate.json` (preferred) and `cookie.txt` (fallback)
- SQLite is used for user/thread/currency persistence — no external DB required
- Commands and events are dynamically loaded from `modules/` at startup
- `!spotify` uses SoundCloud via play-dl (YouTube is blocked by Meta bot detection)
- `!createmusic` detects mood (love/sad/happy/gospel/upbeat) from the theme and generates a matching chord-based background using ffmpeg synth
- Broadcast uses jitter scheduling (±5 min) to avoid Meta pattern detection
- `utils/protection.js` provides keep-alive pings, UA rotation, and request rate limiting

## Anti-Detect Protection (utils/protection.js)
- **Keep-alive**: pings Facebook API every ~8 min to maintain MQTT session without re-login
- **No re-login trigger**: appstate is reused as-is; no fresh login that would invalidate other browser sessions (flowsurf, etc.)
- **User-agent rotation**: 9 real Chrome/Firefox/Safari/Edge UA strings
- **Rate limiter**: max 8 sends/minute global throttle
- **Jitter scheduling**: broadcast uses ±5 min random delay to avoid pattern detection
- **Browser headers**: `fca-config.json` sets Accept, Accept-Language, DNT, Sec-Fetch headers

## Product
- Responds to commands with a configurable prefix (default: `!`)
- Handles Facebook group events (join/leave notifications)
- Auto-broadcasts Jesus + remembrance messages to all GCs every ~1 hour
- Per-thread autopost toggle (admin): every 51 minutes, non-stop
- PH radio live streaming (30-sec clips), music creation, TTS jingles
- Economy system, user/thread banning, admin controls

## User preferences
- Deployment targets: Render.com (recommended), Netlify, Vercel
- `render.yaml`, `netlify.toml`, `vercel.json` config files are present

## Gotchas
- Bot will exit immediately if neither `appstate.json` nor `cookie.txt` is present
- `appstate.json` must be a valid JSON array (not a placeholder string)
- Render.com Worker is the best fit — Netlify/Vercel are serverless and not ideal for a persistent MQTT connection
- `appstate.json` and `cookie.txt` are in `.gitignore` — never commit credentials
- `!spotify` uses SoundCloud (not YouTube) — YouTube is actively blocking server IPs
- Radio station streams may go offline; only Home Radio 95.1 and DZRH 666 AM were confirmed live during testing

## Pointers
- Deployment configs: `render.yaml`, `netlify.toml`, `vercel.json`
- Language files: `languages/en.lang`, `languages/vi.lang`
- Protection module: `utils/protection.js`
