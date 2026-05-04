# Mirai Bot V3 Unofficial

## Overview
A Facebook Messenger chatbot built with Node.js. It connects to Facebook via cookies/credentials and listens for messages, responding to commands and events.

## Architecture
- **Runtime**: Node.js 20
- **Entry point**: `index.js` (spawns `mirai.js` with auto-restart)
- **Database**: SQLite via Sequelize (`Fca_Database/database.sqlite`)
- **Facebook API**: `@dongdev/fca-unofficial`

## Project Structure
- `index.js` - Entry point with auto-restart logic
- `mirai.js` - Main bot logic, connects to Facebook, loads modules
- `config.json` - Bot configuration (credentials, prefix, admin settings)
- `fca-config.json` - Facebook API config (MQTT settings)
- `modules/commands/` - Bot commands (help, ping, admin, etc.)
- `modules/events/` - Event handlers (join, leave notifications)
- `includes/` - Core includes: database, controllers, event handlers
- `languages/` - Language files (`en.lang`, `vi.lang`)
- `utils/` - Utility functions and logging

## Setup Requirements
The bot requires a `cookie.txt` file in the project root containing the Facebook account cookies for the bot account.

## Configuration
Edit `config.json` to set:
- `EMAIL` / `PASSWORD` / `OTPKEY` - Facebook credentials
- `FACEBOOK_ADMIN` - Admin Facebook ID
- `BOTNAME` - Bot display name
- `PREFIX` - Command prefix (default: `!`)
- `ADMINBOT` - Array of admin user IDs
- `language` - Bot language (`en` or `vi`)

## Running
```bash
node index.js
```

## Dependencies
All npm dependencies are listed in `package.json`. Key ones:
- `@dongdev/fca-unofficial` - Facebook Chat API
- `sequelize` + `sqlite3` - Database ORM
- `canvas`, `jimp` - Image processing
- `moment-timezone` - Time handling
- `node-cron` - Scheduled tasks
