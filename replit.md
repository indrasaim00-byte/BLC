# Overview

Goat Bot V2 (BLACK) is a comprehensive Facebook Messenger chatbot built with Node.js that operates using a personal Facebook account through an unofficial Facebook API. The bot provides extensive command handling, event management, user/thread data management, and a web-based dashboard for configuration.

# Project Structure

```
/
├── index.js              # Entry point - spawns Goat.js and runs uptime server (port 3000)
├── Goat.js               # Main bot orchestrator - handles init, config, and login
├── utils.js              # Utility functions (networking, text, formatting)
├── config.json           # Global bot settings (prefix, admin IDs, language)
├── configCommands.json   # Per-command and environment variable configuration
├── account.txt           # Facebook session/cookie data for login
├── package.json          # Node.js dependencies
│
├── bot/                  # Core bot logic
│   ├── handler/          # Event and message handlers
│   │   ├── handlerAction.js       # Routes events to handlers
│   │   ├── handlerCheckData.js    # Ensures user/thread data in DB
│   │   └── handlerEvents.js       # Event processing
│   ├── login/            # Authentication with Facebook
│   │   ├── login.js               # Main login flow
│   │   ├── loadData.js            # Loads DB data on start
│   │   ├── loadScripts.js         # Loads command/event scripts
│   │   └── ...
│   ├── autoUptime.js
│   └── custom.js
│
├── scripts/              # Bot plugins
│   ├── cmds/             # Command plugins (triggered by prefix e.g. !help)
│   └── events/           # Event plugins (triggered by FB events like join/leave)
│
├── languages/            # Localization files (en, vi, bn)
├── logger/               # Logging utilities
├── func/                 # Utility functions (colors, prism)
│
└── .agents/              # Dashboard and database layer
    ├── dashboard/        # Web dashboard (Express + Socket.io)
    └── database/         # DB controllers and models (SQLite/MongoDB)
```

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Architecture
- **Entry Point**: `index.js` spawns `Goat.js` and runs an uptime Express server on port 3000
- **Main Bot Logic**: `Goat.js` handles initialization, configuration, and login
- **Plugin System**: Commands in `scripts/cmds/`, events in `scripts/events/`
- **Multi-Database**: Supports JSON, SQLite, and MongoDB

## Running the Bot
- Workflow: `node index.js`
- The bot requires a valid Facebook appstate/cookie in `account.txt` to log in

## External Dependencies
- **Node.js 18.x**
- **fca-eryxenx**: Custom Facebook Chat API
- **Express.js**: Uptime server + Dashboard
- **Sequelize/Mongoose**: Database ORM
- **Socket.io**: Real-time dashboard updates
- **Canvas**: Image generation (requires libuuid system library)
