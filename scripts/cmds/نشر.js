const axios = require("axios");

async function getFbTokens(cookieStr, userAgent) {
  const res = await axios.get("https://mbasic.facebook.com/", {
    headers: {
      cookie: cookieStr,
      "user-agent": userAgent,
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ar,en;q=0.9"
    },
    timeout: 15000,
    maxRedirects: 5
  });

  const html = res.data;

  const dtsgMatch = html.match(/name="fb_dtsg"\s+value="([^"]+)"/);
  const jazoestMatch = html.match(/name="jazoest"\s+value="([^"]+)"/);

  if (!dtsgMatch) throw new Error("تعذّر الحصول على رمز الجلسة (fb_dtsg)");

  return {
    fb_dtsg: dtsgMatch[1],
    jazoest: jazoestMatch ? jazoestMatch[1] : ""
  };
}

async function postToTimeline(cookieStr, userAgent, text, privacyOption) {
  const tokens = await getFbTokens(cookieStr, userAgent);

  const privacyMap = {
    "عام": "EVERYONE",
    "اصدقاء": "FRIENDS",
    "انا": "SELF"
  };
  const audience = privacyMap[privacyOption] || "FRIENDS";

  const params = new URLSearchParams({
    fb_dtsg: tokens.fb_dtsg,
    jazoest: tokens.jazoest,
    status: text,
    "audience[0][value]": audience,
    "audience[0][description]": audience === "EVERYONE" ? "Public" : audience === "FRIENDS" ? "Friends" : "Only me",
    post: "Post"
  });

  const res = await axios.post("https://mbasic.facebook.com/composer/", params.toString(), {
    headers: {
      cookie: cookieStr,
      "user-agent": userAgent,
      "content-type": "application/x-www-form-urlencoded",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ar,en;q=0.9",
      "origin": "https://mbasic.facebook.com",
      "referer": "https://mbasic.facebook.com/"
    },
    timeout: 20000,
    maxRedirects: 5,
    validateStatus: s => s < 400
  });

  return res.status;
}

module.exports = {
  config: {
    name: "نشر",
    aliases: ["post", "publish"],
    version: "1.0",
    author: "Saint",
    countDown: 15,
    role: 2,
    shortDescription: "نشر منشور على الجدول الزمني",
    category: "admin",
    guide: "{pn} [النص] | [عام/اصدقاء/انا]"
  },

  onStart: async function ({ api, event, args, message }) {
    const raw = args.join(" ").trim();

    if (!raw) {
      return message.reply(
        "📢 أمر النشر\n\n" +
        "الاستخدام:\n" +
        "• .نشر [النص] | عام\n" +
        "• .نشر [النص] | اصدقاء\n" +
        "• .نشر [النص] | انا\n\n" +
        "مثال:\n.نشر مرحبا بالجميع! | عام"
      );
    }

    const parts = raw.split("|");
    const text = parts[0].trim();
    const privacy = (parts[1] || "اصدقاء").trim();

    if (!text) return message.reply("❌ اكتب النص الذي تريد نشره.");

    const appState = api.getAppState();
    if (!appState || !appState.length) return message.reply("❌ لا توجد جلسة نشطة.");

    const cookieStr = appState.map(c => `${c.key}=${c.value}`).join("; ");
    const userAgent = global.BlackBot?.config?.facebookAccount?.userAgent ||
      "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

    try {
      const botName = global.BlackBot?.config?.nickNameBot || "BlackBot";
      await message.reply("⏳ جاري النشر...");
      await postToTimeline(cookieStr, userAgent, text, privacy);
      return message.reply(`✅ تم النشر بواسطة ${botName}!\n\n📝 النص: ${text}\n🔒 الجمهور: ${privacy}`);
    } catch (err) {
      return message.reply(`❌ فشل النشر.\nالخطأ: ${err.message}`);
    }
  }
};
