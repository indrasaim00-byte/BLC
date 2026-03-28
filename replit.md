# BlackBot V2 - Facebook Messenger Bot

## Overview
BlackBot V2 is a feature-rich Facebook Messenger bot built on Node.js using the `fca-eryxenx` Facebook Chat API library. It supports AI (Gemini), custom commands, event handlers, a web dashboard, and SQLite/MongoDB database.

## Tech Stack
- **Runtime:** Node.js 18.x
- **Bot Framework:** fca-eryxenx (Facebook Chat API)
- **Web Framework:** Express.js (dashboard + uptime server)
- **Database:** SQLite (via Sequelize) or MongoDB (via Mongoose)
- **AI:** Google Gemini API
- **Template Engine:** Eta
- **Auth:** Passport.js
- **Real-time:** Socket.io

## Entry Points
- `index.js` — Starts uptime server (port 3000) and launches `Goat.js` as a child process
- `Goat.js` — Main bot logic: loads config, initializes DB, triggers login
- `bot/login/login.js` — Facebook login handler (cookies/token/email+password)

## Key Files
- `config.json` — Main configuration (email, password, API keys, admin IDs) — **SECRET, not in git**
- `account.txt` — Facebook cookies/appstate in JSON format — **SECRET, not in git**
- `fca-config.json` — FCA login credentials — **SECRET, not in git**
- `config.example.json` — Template for config.json (safe to commit)
- `account.example.txt` — Instructions for getting Facebook cookies
- `fca-config.example.json` — Template for fca-config.json

## Directory Structure
```
├── index.js              - Entry point
├── Goat.js               - Core bot logic
├── config.json           - Bot configuration (SECRET)
├── config.example.json   - Config template
├── account.txt           - Facebook cookies (SECRET)
├── account.example.txt   - Cookie instructions
├── fca-config.json       - FCA config (SECRET)
├── fca-config.example.json - FCA config template
├── setup.sh              - Automated setup script for Linux
├── README.md             - Full documentation
├── scripts/
│   ├── cmds/             - Bot commands
│   └── events/           - Bot event handlers
├── bot/login/            - Login logic
├── dashboard/            - Web dashboard (Express, Passport, Socket.io)
├── database/             - Database controllers (SQLite/MongoDB)
├── logger/               - Logging utilities
├── languages/            - Localization files
└── func/                 - Utility functions
```

## Environment Setup (Replit)
System dependencies installed via replit.nix:
- cairo, pango, libjpeg, giflib, librsvg, pixman (for canvas)
- pkg-config, python3, gnumake, gcc, libpng

After `npm install`, native modules must be rebuilt:
```bash
npm rebuild canvas sqlite3
```

## Workflow
- **Start application:** `node index.js` (console mode, port 3000)

## GitHub Setup
The project includes:
- `.gitignore` — Excludes node_modules, config.json, account.txt, fca-config.json, databases
- `setup.sh` — Automated Linux setup script
- `README.md` — Full Arabic documentation

## Known Issues / Notes
- Gemini API key must be valid and not leaked. Get a new one at: https://makersuite.google.com/app/apikey
- Facebook cookies in `account.txt` expire periodically and need to be refreshed
- The `canvas` and `sqlite3` packages require system libraries and must be rebuilt after fresh npm install
