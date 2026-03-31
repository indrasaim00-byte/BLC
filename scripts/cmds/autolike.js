const LIKE_STICKER_ID = "369239263222822";
const INTERVAL_MS = 60 * 60 * 1000;

const INTERVAL_KEY = "__autoLikeStickerInterval__";

module.exports = {
  config: {
    name: "autolike",
    version: "1.0",
    author: "سايم",
    role: 2,
    shortDescription: "إرسال لايك تلقائي لمجموعة عشوائية كل ساعة",
    category: "admin",
    guide: "{pn} on | off",
    countDown: 5
  },

  onStart: async ({ api, args, event, message }) => {
    const sub = (args[0] || "").toLowerCase();

    if (sub === "off") {
      if (global[INTERVAL_KEY]) {
        clearInterval(global[INTERVAL_KEY]);
        global[INTERVAL_KEY] = null;
      }
      return message.reply("⏹️ تم إيقاف اللايك التلقائي.");
    }

    if (sub === "on" || !sub) {
      if (global[INTERVAL_KEY]) {
        return message.reply("✅ اللايك التلقائي شغّال بالفعل.");
      }
      startAutoLike(api);
      return message.reply(`✅ تم تفعيل اللايك التلقائي!\nسيُرسل لايك لمجموعة عشوائية كل ساعة.`);
    }

    return message.reply("الاستخدام: .autolike on / .autolike off");
  }
};

function getRandomGroup() {
  try {
    const all = global.db?.allThreadData || [];
    const groups = all.filter(t => {
      if (!t || !t.threadID) return false;
      const id = String(t.threadID);
      return id.length >= 15;
    });
    if (!groups.length) return null;
    return groups[Math.floor(Math.random() * groups.length)];
  } catch (_) {
    return null;
  }
}

function startAutoLike(api) {
  const tick = async () => {
    try {
      const group = getRandomGroup();
      if (!group) {
        console.log("[autolike] لا توجد مجموعات في قاعدة البيانات.");
        return;
      }
      const threadID = group.threadID;
      await api.sendMessage({ sticker: LIKE_STICKER_ID }, threadID);
      console.log(`[autolike] ✅ تم إرسال لايك إلى: ${group.threadName || threadID}`);
    } catch (err) {
      console.error("[autolike] ❌ خطأ:", err.message);
    }
  };

  tick();
  global[INTERVAL_KEY] = setInterval(tick, INTERVAL_MS);
}
