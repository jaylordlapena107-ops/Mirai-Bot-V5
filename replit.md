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
- Scheduling: `node-cron`

## Where things live
- `index.js` — entry point, auto-restarts `mirai.js` on crash
- `mirai.js` — main bot logic: login, load modules, connect MQTT
- `config.json` — bot settings (prefix, admin IDs, feature flags)
- `fca-config.json` — Facebook API MQTT options
- `modules/commands/` — bot commands (help, ping, admin, etc.)
- `modules/events/` — event handlers (join/leave notifications)
- `includes/` — database setup, controllers, event/command handlers
- `languages/` — `en.lang`, `vi.lang`
- `utils/` — logging, utilities, runtime data

## Architecture decisions
- `index.js` wraps `mirai.js` in a child process with up to 5 auto-restarts on crash
- Login supports both `appstate.json` (preferred) and `cookie.txt` (fallback)
- SQLite is used for user/thread/currency persistence — no external DB required
- Commands and events are dynamically loaded from `modules/` at startup
- Modules declare `config.envConfig` to inject per-module config into `global.config`

## Product
- Responds to commands with a configurable prefix (default: `!`)
- Handles Facebook group events (join/leave notifications)
- Per-thread settings (prefix, banned commands, NSFW flag)
- Economy system (currencies), user/thread banning, admin controls
- Scheduled tasks via `node-cron`

## User preferences
- Deployment targets: Render.com (recommended), Netlify, Vercel
- `render.yaml`, `netlify.toml`, `vercel.json` config files are present

## Gotchas
- Bot will exit immediately if neither `appstate.json` nor `cookie.txt` is present
- `appstate.json` must be a valid JSON array (not a placeholder string)
- Render.com Worker is the best fit — Netlify/Vercel are serverless and not ideal for a persistent MQTT connection
- `appstate.json` and `cookie.txt` are in `.gitignore` — never commit credentials

## Pointers
- Deployment configs: `render.yaml`, `netlify.toml`, `vercel.json`
- Language files: `languages/en.lang`, `languages/vi.lang`
