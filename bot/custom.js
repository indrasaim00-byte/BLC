const { log } = global.utils;
const startKeepAlive = require("./keepAlive.js");

module.exports = async function ({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getText }) {

        setInterval(async () => {
                api.refreshFb_dtsg()
                        .then(() => {
                                log.succes("refreshFb_dtsg", getText("custom", "refreshedFb_dtsg"));
                        })
                        .catch((err) => {
                                log.error("refreshFb_dtsg", getText("custom", "refreshedFb_dtsgError"), err);
                        });
        }, 1000 * 60 * 60 * 48);

        startKeepAlive();

        const HEAP_LIMIT_MB = 460;
        const RSS_LIMIT_MB = 600;
        const MEMORY_CHECK_INTERVAL = 5 * 60 * 1000;

        setInterval(() => {
                try {
                        if (global.gc) global.gc();
                } catch (_) {}

                const mem = process.memoryUsage();
                const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
                const rssMB = Math.round(mem.rss / 1024 / 1024);

                if (heapMB > HEAP_LIMIT_MB || rssMB > RSS_LIMIT_MB) {
                        log.warn("MEMORY", `Memory critical: Heap=${heapMB}MB RSS=${rssMB}MB — restarting to prevent OOM...`);
                        process.exit(2);
                }
        }, MEMORY_CHECK_INTERVAL);
};
