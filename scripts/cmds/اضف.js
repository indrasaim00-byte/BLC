module.exports = {
  config: {
    name: "اضف",
    aliases: ["adduser2"],
    version: "1.0",
    author: "Saint",
    role: 0,
    shortDescription: "إضافة عضو للمجموعة",
    category: "box",
    guide: "{pn} [UID أو رابط الملف الشخصي]",
    countDown: 5
  },

  onStart: async ({ api, event, args, message }) => {
    const { threadID } = event;

    if (!args[0]) return message.reply("〔!〕 اكتب /اضف [ID أو رابط]");

    let uid = args[0].trim();

    // إذا كان رابطاً، نستخرج الـ UID منه
    if (uid.includes("facebook.com") || uid.includes("fb.com")) {
      try {
        uid = await api.getUID(uid);
      } catch (e) {
        return message.reply("〔✗〕 تعذّر استخراج الـ ID من الرابط.");
      }
    }

    // التحقق أن الـ ID رقمي
    if (!/^\d+$/.test(uid)) {
      return message.reply("〔✗〕 ID غير صالح.");
    }

    try {
      await api.addUserToGroup(uid, threadID);
    } catch (err) {
      return message.reply("〔✗〕 تعذّرت الإضافة، تأكد من صحة الـ ID أو أن البوت يملك الصلاحية.");
    }
  }
};
