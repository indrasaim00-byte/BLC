const fs = require("fs");
const path = require("path");

const DEVELOPER_IDS = ["61583835186508", "61587142678804"];
const FAREWELL_IMG = path.join(__dirname, "assets", "farewell_dev.jpg");

module.exports = {
  config: {
    name: "farewellDev",
    version: "1.0",
    author: "Saint",
    description: "يودّع المطور عند مغادرة المجموعة",
    category: "events"
  },

  onStart: async ({ api, event }) => {
    if (event.logMessageType !== "log:unsubscribe") return;

    const leftID = String(event.logMessageData?.leftParticipantFbId || "");
    if (!DEVELOPER_IDS.includes(leftID)) return;

    const { threadID } = event;

    try {
      const msg = { body: "رافقتك السلامة يا ملكي 🖤" };
      if (fs.existsSync(FAREWELL_IMG)) {
        msg.attachment = fs.createReadStream(FAREWELL_IMG);
      }
      await api.sendMessage(msg, threadID);
    } catch (_) {}
  }
};
