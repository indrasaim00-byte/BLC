const fs = require("fs-extra");
const path = __dirname + "/cache/autoseen.json";

if (!fs.existsSync(path)) {
  fs.writeFileSync(path, JSON.stringify({ status: true }, null, 2));
}

module.exports = {
  config: {
    name: "مشاهدة-تلقائية",
    aliases: ["autoseen"],
    version: "2.0",
    author: "Saint",
    countDown: 0,
    role: 0,
    shortDescription: "نظام المشاهدة التلقائية",
    longDescription: "البوت سيشاهد جميع الرسائل الجديدة تلقائياً.",
    category: "system",
    guide: {
      en: "{pn} on/off",
    },
  },

  onStart: async function ({ message, args }) {
    const data = JSON.parse(fs.readFileSync(path));
    if (!args[0]) {
      return message.reply(`◈ حالة المشاهدة التلقائية: ${data.status ? "〔✓〕 مفعّلة" : "〔✗〕 معطّلة"}`);
    }

    if (args[0].toLowerCase() === "on") {
      data.status = true;
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
      return message.reply("〔✓〕 المشاهدة التلقائية مفعّلة الآن!");
    } else if (args[0].toLowerCase() === "off") {
      data.status = false;
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
      return message.reply("〔✗〕 المشاهدة التلقائية معطّلة الآن!");
    } else {
      return message.reply("〔!〕 الاستخدام: autoseen on / off");
    }
  },

  onChat: async function ({ event, api }) {
    try {
      const data = JSON.parse(fs.readFileSync(path));
      if (data.status === true) {
        api.markAsReadAll();
      }
    } catch (e) {
      console.error(e);
    }
  },
};
