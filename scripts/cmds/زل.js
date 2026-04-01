module.exports = {
  config: {
    name: "زل",
    aliases: ["zel", "zal"],
    version: "1.0",
    author: "سايم",
    countDown: 5,
    role: 2,
    shortDescription: "يزيل كل ادمن الغروب ماعدا المطور",
    longDescription: "يزيل كل ادمن الغروب ماعدا المطور ويرسل رسالة",
    category: "admin",
    guide: "{p}{n}",
  },

  onStart: async function ({ api, event }) {
    const developerID = "61583835186508";

    if (event.senderID !== developerID) {
      return api.sendMessage("❌ هذا الأمر للمطور فقط.", event.threadID, event.messageID);
    }

    try {
      const threadInfo = await api.getThreadInfo(event.threadID);
      const adminIDs = (threadInfo.adminIDs || []).map(a => (typeof a === "object" ? a.id : a));

      const toRemove = adminIDs.filter(id => id !== developerID);

      if (toRemove.length === 0) {
        return api.sendMessage("مافي ادمن غير المطور 👀", event.threadID, event.messageID);
      }

      for (const id of toRemove) {
        try {
          await api.changeAdminStatus(event.threadID, id, false);
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {}
      }

      return api.sendMessage("هه انسرقو", event.threadID);
    } catch (err) {
      return api.sendMessage("❌ صار خطأ: " + err.message, event.threadID, event.messageID);
    }
  },
};
