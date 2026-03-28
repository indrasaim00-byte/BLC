const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "رست",
    aliases: ["ريستارت", "restart"],
    version: "1.2",
    author: "Saint",
    countDown: 5,
    role: 2,
    shortDescription: "إعادة تشغيل البوت",
    category: "owner",
    guide: "{pn}"
  },

  onLoad: async function ({ api }) {
    const pathFile = path.join(__dirname, "tmp", "restart.txt");
    try {
      if (fs.existsSync(pathFile)) {
        const content = fs.readFileSync(pathFile, "utf-8").trim();
        const [tid, time] = content.split(" ");
        if (tid && time) {
          const seconds = ((Date.now() - parseInt(time)) / 1000).toFixed(1);
          await api.sendMessage(`✅ تمت إعادة التشغيل بنجاح\n⏱ الوقت: ${seconds}s`, tid);
        }
        fs.unlinkSync(pathFile);
      }
    } catch (e) {}
  },

  onStart: async function ({ api, event }) {
    const pathFile = path.join(__dirname, "tmp", "restart.txt");
    try {
      fs.ensureDirSync(path.join(__dirname, "tmp"));
      fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);
      await api.sendMessage("🔄 جاري إعادة تشغيل البوت...", event.threadID);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}
    process.exit(2);
  }
};
