const fs = require("fs-extra");
const path = require("path");

function getDirStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;
    if (!fs.existsSync(dirPath)) return { fileCount, totalSize };
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const sub = getDirStats(fullPath);
                fileCount += sub.fileCount;
                totalSize += sub.totalSize;
            } else {
                fileCount++;
                totalSize += stat.size;
            }
        } catch (_) {}
    }
    return { fileCount, totalSize };
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

module.exports = {
    config: {
        name: "حذف-تخزين",
        aliases: ["clear-cache"],
        version: "1.0",
        author: "Saint",
        countDown: 10,
        role: 2,
        description: {
            ar: "حذف جميع ملفات التخزين المؤقت للبوت",
            en: "Delete all bot cache files"
        },
        category: "owner",
        guide: {
            ar: "   {pn}: حذف جميع ملفات الكاش والملفات المؤقتة",
            en: "   {pn}: delete all cache and temp files"
        }
    },

    langs: {},

    onStart: async function ({ api, event }) {
        const threadID = event.threadID;
        const cacheDir = path.join(__dirname, "cache");
        const tmpDir = path.join(__dirname, "tmp");

        const cacheStat = getDirStats(cacheDir);
        const tmpStat = getDirStats(tmpDir);
        const totalFiles = cacheStat.fileCount + tmpStat.fileCount;
        const totalSize = cacheStat.totalSize + tmpStat.totalSize;

        if (totalFiles === 0) {
            const emptyMsg =
                `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n` +
                `✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n\n` +
                `  ⚠️ لا توجد ملفات مؤقتة للحذف\n` +
                `  📂 المجلدات فارغة بالفعل\n\n` +
                `╭──────╮\n` +
                `     ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝕷𝗶⃪𝘀⃪t⃫\n` +
                `╰──────╯`;
            return api.sendMessage(emptyMsg, threadID);
        }

        api.sendMessage(
            `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n\n` +
            `  ⏳ جاري حذف ${totalFiles} ملف...\n` +
            `  📦 الحجم: ${formatSize(totalSize)}`,
            threadID
        );

        let cacheErr = false;
        let tmpErr = false;

        if (fs.existsSync(cacheDir)) {
            try {
                fs.emptyDirSync(cacheDir);
            } catch (e) {
                cacheErr = true;
            }
        }

        if (fs.existsSync(tmpDir)) {
            try {
                fs.emptyDirSync(tmpDir);
            } catch (e) {
                tmpErr = true;
            }
        }

        const afterCache = getDirStats(cacheDir);
        const afterTmp = getDirStats(tmpDir);
        const actualDeleted = totalFiles - (afterCache.fileCount + afterTmp.fileCount);
        const actualFreed = totalSize - (afterCache.totalSize + afterTmp.totalSize);
        const hasErrors = cacheErr || tmpErr;

        let resultMsg =
            `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n` +
            `✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n\n`;

        if (!hasErrors) {
            resultMsg += `  ✅ تم حذف التخزين المؤقت بنجاح!\n\n`;
        } else {
            resultMsg += `  ⚠️ تم الحذف مع بعض الأخطاء\n\n`;
        }

        resultMsg +=
            `「1」↞〔📁 ملفات الكاش: ${cacheStat.fileCount}〕\n` +
            `「2」↞〔📁 ملفات مؤقتة: ${tmpStat.fileCount}〕\n` +
            `「3」↞〔📊 ملفات محذوفة: ${actualDeleted}/${totalFiles}〕\n` +
            `「4」↞〔💾 المساحة المحررة: ${formatSize(actualFreed)}〕\n` +
            `\n╭──────╮\n` +
            `     ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝕷𝗶⃪𝘀⃪t⃫\n` +
            `╰──────╯  تم تنظيف البوت`;

        api.sendMessage(resultMsg, threadID);
    }
};
