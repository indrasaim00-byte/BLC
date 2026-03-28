module.exports = {
  config: {
    name: "خروج",
    aliases: ["out"],
    version: "2.0",
    author: "Saint",
    countDown: 5,
    role: 2,
    shortDescription: "إخراج البوت من المجموعة",
    longDescription: "يتم من خلال هذا الأمر إخراج البوت من المجموعة الحالية أو مجموعة محددة.",
    category: "owner",
    guide: {
      en: "{pn} [threadID (اختياري)]",
    },
  },

  onStart: async function ({ api, event, args }) {
    const botID = api.getCurrentUserID();
    const targetThread = args[0] || event.threadID;

    try {
      await api.sendMessage("↞ وداعاً للجميع! البوت يغادر المجموعة الآن...", targetThread);
      await api.removeUserFromGroup(botID, targetThread);
    } catch (error) {
      console.error(error);
      return api.sendMessage("〔✗〕 تعذّر الخروج! ربما البوت ليس مشرفاً أو حدثت مشكلة ما.", event.threadID);
    }
  },
};
