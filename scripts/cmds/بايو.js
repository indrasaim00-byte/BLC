module.exports = {
  config: {
    name: "بايو",
    aliases: ["bio", "setbio"],
    version: "1.0",
    author: "Saint",
    countDown: 10,
    role: 2,
    shortDescription: "تغيير البايو (السيرة الذاتية) للبوت",
    category: "admin",
    guide: "{pn} [النص]\n{pn} مسح — لحذف البايو"
  },

  onStart: async function ({ api, event, args, message }) {
    const input = args.join(" ").trim();

    if (!input) {
      return message.reply(
        "📝 أمر البايو\n\n" +
        "الاستخدام:\n" +
        "• .بايو [النص] — تعيين بايو جديد\n" +
        "• .بايو مسح — حذف البايو الحالي\n\n" +
        "مثال:\n.بايو بوت جزائري مطوّر من سايم 🤖"
      );
    }

    const bioText = input === "مسح" ? "" : input;

    try {
      await message.reply("⏳ جاري تغيير البايو...");
      await api.changeBio(bioText, true);

      if (bioText === "") {
        return message.reply("✅ تم حذف البايو بنجاح!");
      }
      return message.reply(`✅ تم تغيير البايو بنجاح!\n\n📝 البايو الجديد:\n${bioText}`);
    } catch (err) {
      return message.reply(`❌ فشل تغيير البايو.\nالخطأ: ${err.message}`);
    }
  }
};
