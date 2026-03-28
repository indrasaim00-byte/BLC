const intervalMap = new Map();
const restoringThreads = new Set(); // لمنع الحلقة المتكررة

module.exports = {
  config: {
    name: "نيم",
    version: "2.1",
    author: "MOHAMMAD AKASH + edit",
    role: 1,
    shortDescription: "قفل اسم المجموعة",
    category: "group",
    guide: "{pn} [الاسم] | off",
    countDown: 3
  },

  onStart: async ({ api, event, message, threadsData, args }) => {
    const { threadID } = event;

    if (!args[0]) return;

    if (args[0].toLowerCase() === "off") {
      await threadsData.set(threadID, { enable: false }, "data.protect");
      if (intervalMap.has(threadID)) {
        clearInterval(intervalMap.get(threadID));
        intervalMap.delete(threadID);
      }
      return;
    }

    const newName = args.join(" ").trim();

    restoringThreads.add(threadID);
    await api.setTitle(newName, threadID);
    setTimeout(() => restoringThreads.delete(threadID), 3000);

    await threadsData.set(threadID, { enable: true, name: newName }, "data.protect");

    if (intervalMap.has(threadID)) clearInterval(intervalMap.get(threadID));

    const interval = setInterval(async () => {
      try {
        const data = await threadsData.get(threadID, "data.protect");
        if (!data?.enable) {
          clearInterval(interval);
          intervalMap.delete(threadID);
          return;
        }
        const current = await api.getThreadInfo(threadID);
        if (current.threadName !== data.name && !restoringThreads.has(threadID)) {
          restoringThreads.add(threadID);
          await api.setTitle(data.name, threadID);
          setTimeout(() => restoringThreads.delete(threadID), 3000);
        }
      } catch (e) {}
    }, 5000);

    intervalMap.set(threadID, interval);
  },

  onEvent: async ({ api, event, threadsData }) => {
    const { threadID, author, logMessageType } = event;
    if (logMessageType !== "log:thread-name") return;

    // تجاهل الحدث إذا البوت هو من غيّر الاسم
    if (restoringThreads.has(threadID)) return;

    const protectData = await threadsData.get(threadID, "data.protect");
    if (!protectData?.enable) return;

    try {
      const info = await api.getThreadInfo(threadID);
      const isAdmin = info.adminIDs.some(e => e.id === author);
      const isBot = api.getCurrentUserID() === author;
      if (!isAdmin && !isBot) {
        restoringThreads.add(threadID);
        await api.setTitle(protectData.name, threadID);
        setTimeout(() => restoringThreads.delete(threadID), 3000);
      }
    } catch (e) {}
  }
};
