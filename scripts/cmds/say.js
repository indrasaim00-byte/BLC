const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "قل",
    aliases: ["say"],
    version: "2.0.0",
    author: "Saint",
    countDown: 5,
    role: 0,
    shortDescription: "تحويل النص إلى صوت عبر Google TTS",
    longDescription: "يحوّل أي نص إلى رسالة صوتية باستخدام خدمة Google Translate ويرسلها.",
    category: "media",
    guide: {
      en: "{p}say <النص>"
    }
  },

  onStart: async function ({ api, event, args }) {
    try {
      const text = args.join(" ") || (event.messageReply?.body ?? null);
      if (!text) return api.sendMessage("〔✗〕 الرجاء كتابة النص المراد تحويله إلى صوت.", event.threadID, event.messageID);

      const filePath = path.join(__dirname, "cache", `${event.senderID}.mp3`);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=bn&client=tw-ob`;

      const response = await axios.get(url, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, Buffer.from(response.data, "utf-8"));

      await api.sendMessage({ attachment: fs.createReadStream(filePath) }, event.threadID, () => {
        fs.unlinkSync(filePath);
      });

    } catch (error) {
      console.error("Say command error:", error);
      api.sendMessage("〔✗〕 حدثت مشكلة ما. حاول مرة أخرى لاحقاً!", event.threadID);
    }
  }
};
