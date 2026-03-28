module.exports = {
  config: {
    name: "اسم-المجموعة",
    aliases: ["groupname"],
    version: "1.1.0",
    author: "Saint",
    countDown: 0,
    role: 1,
    shortDescription: "تغيير اسم المجموعة",
    longDescription: "الاسم الذي تكتبه سيصبح الاسم الجديد للمجموعة.",
    category: "box",
    guide: "{pn} [الاسم الجديد]"
  },

  onStart: async function ({ api, event, args }) {
    const name = args.join(" ");

    if (!name) {
      return api.sendMessage(
        "〔✗〕 الرجاء كتابة الاسم الجديد للمجموعة!\n\n✎ مثال: /groupname Dark Army",
        event.threadID,
        event.messageID
      );
    }

    try {
      await api.setTitle(name, event.threadID);
      api.sendMessage(`〔✓〕 تم تغيير اسم المجموعة إلى:\n↞ ${name}`, event.threadID, event.messageID);
    } catch (err) {
      console.error(err);
      api.sendMessage("〔!〕 تعذّر تغيير الاسم! تأكد من أن البوت يملك الصلاحيات الكافية.", event.threadID, event.messageID);
    }
  }
};
