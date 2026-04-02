const { spawn } = require("child_process");
const log = require("./logger/log.js");

let restartCount = 0;
let lastRestartTime = 0;
const MAX_RAPID_RESTARTS = 5;
const RAPID_RESTART_WINDOW = 60000;
const BASE_RESTART_DELAY = 3000;
const MAX_RESTART_DELAY = 60000;

function getRestartDelay() {
        const now = Date.now();
        if (now - lastRestartTime > RAPID_RESTART_WINDOW) {
                restartCount = 0;
        }
        restartCount++;
        if (restartCount > MAX_RAPID_RESTARTS) {
                const delay = Math.min(MAX_RESTART_DELAY, BASE_RESTART_DELAY * Math.pow(2, restartCount - MAX_RAPID_RESTARTS));
                return delay;
        }
        return BASE_RESTART_DELAY;
}

function startProject() {
        lastRestartTime = Date.now();
        const child = spawn("node", ["--max-old-space-size=512", "--expose-gc", "Goat.js"], {
                cwd: __dirname,
                stdio: "inherit",
                shell: false,
                env: { ...process.env }
        });

        child.on("close", (code, signal) => {
                const reason = signal ? `signal ${signal}` : `exit code ${code}`;
                const isRequested = (code == 2);
                log.info(`Bot process ended (${reason}).${isRequested ? ' Requested restart.' : ' Unexpected exit.'}`);

                const delay = isRequested ? Math.max(2000, getRestartDelay()) : getRestartDelay();
                log.info(`Restarting in ${Math.round(delay / 1000)}s (restart #${restartCount})...`);
                setTimeout(() => {
                        startProject();
                }, delay);
        });

        child.on("error", (err) => {
                log.info(`Failed to start bot process: ${err.message}. Retrying in 5s...`);
                setTimeout(() => {
                        startProject();
                }, 5000);
        });
}

startProject();

const express = require('express');
const app = express();

app.get('/', (req, res) => {
        res.send('Bot is running!');
});

const server = app.listen(3000, () => {
        console.log('Uptime server running on port 3000');
});

server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
                console.log('Port 3000 already in use, skipping express server start.');
        } else {
                throw err;
        }
});
