const chalk = require('chalk');
const path = require('path');
const { log, createOraDots, getText } = global.utils;

// Updated Big Text Header
const bigText = `
░██████╗░█████╗░██╗███╗░░██╗████████╗
██╔════╝██╔══██╗██║████╗░██║╚══██╔══╝
╚█████╗░███████║██║██╔██╗██║░░░██║░░░
░╚═══██╗██╔══██║██║██║╚████║░░░██║░░░
██████╔╝██║░░██║██║██║░╚███║░░░██║░░░
╚═════╝░╚═╝░░╚═╝╚═╝╚═╝░░╚══╝░░░╚═╝░░░
`;

function header(title) {
        return chalk.cyanBright(
`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                 ${title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        );
}

function line(text) {
        return chalk.hex("#ffd369")(text);
}

module.exports = async function (api, createLine) {

        // HEADER
        console.log(chalk.green(bigText));
        console.log(header("🚀 BLACK MAHORA DATABASE"));
        console.log(line("📦 Loading system resources…"));

        const controller = await require(path.join(__dirname, '..', '..', 'database/controller/index.js'))(api);
        const { threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, sequelize } = controller;

        log.info('DATABASE', `🧵 Thread data: OK`);
        log.info('DATABASE', `👤 User data: OK`);

        // AUTO SYNC
        if (api && global.BlackBot.config.database.autoSyncWhenStart == true) {

                console.log(header("🔄 AUTO SYNC ENABLED"));

                const spin = createOraDots(getText('loadData', 'refreshingThreadData'));

                try {
                        spin._start();

                        const threadDataWillSet = [];
                        const allThreadData = [...global.db.allThreadData];

                        const allThreadInfo = await api.getThreadList(9999999, null, 'INBOX');

                        for (const threadInfo of allThreadInfo) {
                                if (threadInfo.isGroup && !allThreadData.some(thread => thread.threadID === threadInfo.threadID)) {
                                        threadDataWillSet.push(await threadsData.create(threadInfo.threadID, threadInfo));
                                } else {
                                        const refreshed = await threadsData.refreshInfo(threadInfo.threadID, threadInfo);
                                        allThreadData.splice(allThreadData.findIndex(thread => thread.threadID === threadInfo.threadID), 1);
                                        threadDataWillSet.push(refreshed);
                                }
                                global.db.receivedTheFirstMessage[threadInfo.threadID] = true;
                        }

                        const allThreadDataDontHaveBot = allThreadData.filter(
                                thread => !allThreadInfo.some(info => thread.threadID === info.threadID)
                        );

                        const botID = api.getCurrentUserID();

                        for (const thread of allThreadDataDontHaveBot) {
                                const me = thread.members.find(m => m.userID == botID);
                                if (me) {
                                        me.inGroup = false;
                                        await threadsData.set(thread.threadID, { members: thread.members });
                                }
                        }

                        global.db.allThreadData = [
                                ...threadDataWillSet,
                                ...allThreadDataDontHaveBot
                        ];

                        spin._stop();
                        log.info('DATABASE', getText('loadData', 'refreshThreadDataSuccess', global.db.allThreadData.length));
                        console.log(chalk.green("✅ Auto Sync Complete!"));
                }
                catch (err) {
                        spin._stop();
                        log.error('DATABASE', getText('loadData', 'refreshThreadDataError'), err);
                }
                finally {}
        }

        console.log(header("💻 SYSTEM READY"));

        return {
                threadModel: threadModel || null,
                userModel: userModel || null,
                dashBoardModel: dashBoardModel || null,
                globalModel: globalModel || null,
                threadsData,
                usersData,
                dashBoardData,
                globalData,
                sequelize
        };
};
