const axios = require("axios");
const { Readable } = require("stream");

module.exports = {
  config: {
    name: "فوتو",
    aliases: ["photo", "setphoto", "avatar"],
    version: "1.0",
    author: "Saint",
    countDown: 15,
    role: 2,
    shortDescription: "تغيير صورة الملف الشخصي للبوت",
    category: "admin",
    guide: "{pn} [رابط الصورة] أو أرسل الأمر مع صورة مرفقة"
  },

  onStart: async function ({ api, event, args, message }) {
    const { attachments } = event;
    const urlArg = args.join(" ").trim();

    let imageBuffer;

    if (attachments && attachments.length > 0 && attachments[0].type === "photo") {
      const imageUrl = attachments[0].url || attachments[0].largePreviewUrl || attachments[0].previewUrl;
      if (!imageUrl) return message.reply("❌ تعذّر الحصول على رابط الصورة المرفقة.");
      try {
        const res = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
        imageBuffer = Buffer.from(res.data);
      } catch (e) {
        return message.reply(`❌ فشل تحميل الصورة المرفقة.\nالخطأ: ${e.message}`);
      }
    } else if (urlArg) {
      if (!/^https?:\/\//i.test(urlArg)) {
        return message.reply("❌ الرابط غير صالح. تأكد أنه يبدأ بـ http أو https.");
      }
      try {
        const res = await axios.get(urlArg, { responseType: "arraybuffer", timeout: 15000 });
        imageBuffer = Buffer.from(res.data);
      } catch (e) {
        return message.reply(`❌ فشل تحميل الصورة من الرابط.\nالخطأ: ${e.message}`);
      }
    } else {
      return message.reply(
        "🖼️ أمر الفوتو\n\n" +
        "الاستخدام:\n" +
        "• أرسل الأمر مع صورة مرفقة\n" +
        "• .فوتو [رابط الصورة]\n\n" +
        "مثال:\n.فوتو https://example.com/image.jpg"
      );
    }

    try {
      await message.reply("⏳ جاري تغيير الصورة الشخصية...");
      const stream = Readable.from(imageBuffer);
      await api.changeAvatar(stream, "📸", Date.now());
      return message.reply("✅ تم تغيير الصورة الشخصية بنجاح!");
    } catch (err) {
      return message.reply(`❌ فشل تغيير الصورة.\nالخطأ: ${err.message}`);
    }
  }
};
