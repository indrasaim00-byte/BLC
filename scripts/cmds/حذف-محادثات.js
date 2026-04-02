module.exports = {
    config: {
        name: "حذف-محادثات",
        aliases: ["delete-threads"],
        version: "1.0",
        author: "Saint",
        countDown: 30,
        role: 2,
        description: {
            ar: "حذف جميع محادثات حساب البوت",
            en: "Delete all bot account conversations"
        },
        category: "owner",
        guide: {
            ar: "   {pn}: حذف جميع المحادثات من حساب البوت",
            en: "   {pn}: delete all conversations from the bot account"
        }
    },

    langs: {},

    onStart: async function ({ api, event }) {
        const threadID = event.threadID;

        api.sendMessage(
            `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n\n` +
            `  ⏳ جاري جلب المحادثات...`,
            threadID
        );

        const seen = new Set();
        seen.add(threadID);
        const tags = ["INBOX", "OTHER", "PENDING"];

        for (const tag of tags) {
            let timestamp = null;
            let hasMore = true;
            while (hasMore) {
                try {
                    const threads = await new Promise((resolve, reject) => {
                        api.getThreadList(500, timestamp, [tag], (err, list) => {
                            if (err) return reject(err);
                            resolve(list || []);
                        });
                    });
                    if (threads.length === 0) {
                        hasMore = false;
                        break;
                    }
                    let newCount = 0;
                    for (const t of threads) {
                        if (!seen.has(t.threadID)) {
                            seen.add(t.threadID);
                            newCount++;
                        }
                        timestamp = t.timestamp;
                    }
                    if (newCount === 0 || threads.length < 500) {
                        hasMore = false;
                    }
                } catch (e) {
                    hasMore = false;
                }
            }
        }

        seen.delete(threadID);
        const allThreads = [...seen];

        if (allThreads.length === 0) {
            const emptyMsg =
                `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n` +
                `✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n\n` +
                `  ⚠️ لا توجد محادثات للحذف\n\n` +
                `╭──────╮\n` +
                `     ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝕷𝗶⃪𝘀⃪t⃫\n` +
                `╰──────╯`;
            return api.sendMessage(emptyMsg, threadID);
        }

        api.sendMessage(
            `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n\n` +
            `  🔄 تم العثور على ${allThreads.length} محادثة\n` +
            `  ⏳ جاري الحذف...`,
            threadID
        );

        let deleted = 0;
        let errors = 0;
        const batchSize = 20;

        for (let i = 0; i < allThreads.length; i += batchSize) {
            const batch = allThreads.slice(i, i + batchSize);
            try {
                await new Promise((resolve, reject) => {
                    api.deleteThread(batch, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
                deleted += batch.length;
            } catch (e) {
                for (const tid of batch) {
                    try {
                        await new Promise((resolve, reject) => {
                            api.deleteThread(tid, (err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                        deleted++;
                    } catch (_) {
                        errors++;
                    }
                }
            }

            if (i + batchSize < allThreads.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        let resultMsg =
            `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n` +
            `✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n\n`;

        if (errors === 0) {
            resultMsg += `  ✅ تم حذف جميع المحادثات بنجاح!\n\n`;
        } else {
            resultMsg += `  ⚠️ تم حذف المحادثات مع بعض الأخطاء\n\n`;
        }

        resultMsg +=
            `「1」↞〔🗑️ محادثات محذوفة: ${deleted}〕\n` +
            `「2」↞〔📊 إجمالي المحادثات: ${allThreads.length}〕\n`;

        if (errors > 0) {
            resultMsg += `「3」↞〔❌ فشل الحذف: ${errors}〕\n`;
        }

        resultMsg +=
            `\n╭──────╮\n` +
            `     ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝕷𝗶⃪𝘀⃪t⃫\n` +
            `╰──────╯  تم تنظيف المحادثات`;

        api.sendMessage(resultMsg, threadID);
    }
};
